//! Waveform decoding and disk cache shared by HTTP requests and startup warming.
use crate::media::{AUDIO_EXTENSIONS, find_with_extension, is_safe_segment};
use axum::{Json, extract::Path as axum_path, http::StatusCode};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use tokio::io::AsyncWriteExt;
use tokio::sync::watch;

type DecodeResult = Result<WaveformData, StatusCode>;
type Decoder = dyn Fn(&str, usize) -> Result<WaveformData, Box<dyn std::error::Error + Send + Sync>>
    + Send
    + Sync;

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
pub(crate) struct WaveformData {
    peaks: Vec<f32>,
    duration: f64,
}

struct InFlight {
    result: watch::Receiver<Option<(DecodeResult, bool)>>,
}

struct WaveformService {
    // Only active work is retained. A completed task removes its own entry.
    in_flight: Mutex<HashMap<PathBuf, Arc<InFlight>>>,
    decoder: Arc<Decoder>,
}

impl WaveformService {
    fn new(decoder: Arc<Decoder>) -> Arc<Self> {
        Arc::new(Self {
            in_flight: Mutex::new(HashMap::new()),
            decoder,
        })
    }

    async fn load(self: &Arc<Self>, base: String) -> (DecodeResult, bool) {
        self.load_with_fallback(base, None).await
    }

    // Startup can decode an audio extension that the HTTP lookup does not
    // recognize. Keep that work separate from an HTTP lookup that must return
    // 404 until the startup cache has actually been published.
    async fn load_with_fallback(
        self: &Arc<Self>,
        base: String,
        audio_fallback: Option<String>,
    ) -> (DecodeResult, bool) {
        let cache_path = PathBuf::from(format!("{base}.waveform.json"));
        if let Some(data) = read_cache(&cache_path).await {
            return (Ok(data), false);
        }
        let entry_key = audio_fallback
            .as_ref()
            .map(PathBuf::from)
            .unwrap_or_else(|| cache_path.clone());

        // Register the worker before the first await. The worker owns the work,
        // so a disconnected HTTP request cannot abandon a blocking decode.
        let mut receiver = {
            let mut active = self.in_flight.lock().unwrap_or_else(|e| e.into_inner());
            if let Some(existing) = active.get(&entry_key) {
                existing.result.clone()
            } else {
                let (sender, receiver) = watch::channel(None);
                let entry = Arc::new(InFlight {
                    result: receiver.clone(),
                });
                active.insert(entry_key.clone(), entry.clone());
                let service = Arc::clone(self);
                tokio::spawn(async move {
                    let cleanup = EntryCleanup {
                        service: Arc::clone(&service),
                        entry_key,
                        entry,
                    };
                    let result = service.generate(&base, &cache_path, audio_fallback).await;
                    // A retry must never attach to a completed failed task.
                    // Cleanup still runs if this worker panics or is aborted.
                    drop(cleanup);
                    sender.send_replace(Some(result));
                });
                receiver
            }
        };
        loop {
            if let Some(result) = receiver.borrow_and_update().clone() {
                return result;
            }
            if receiver.changed().await.is_err() {
                return (Err(StatusCode::INTERNAL_SERVER_ERROR), false);
            }
        }
    }

    async fn generate(
        &self,
        base: &str,
        cache_path: &Path,
        audio_fallback: Option<String>,
    ) -> (DecodeResult, bool) {
        // A request can have read the cache immediately before another worker
        // publishes it; recheck after becoming the sole worker for this song.
        if let Some(data) = read_cache(cache_path).await {
            return (Ok(data), false);
        }
        let Some(audio_path) = find_with_extension(base, &AUDIO_EXTENSIONS)
            .await
            .or(audio_fallback)
        else {
            return (Err(StatusCode::NOT_FOUND), false);
        };
        let decoder = Arc::clone(&self.decoder);
        let data = match tokio::task::spawn_blocking(move || decoder(&audio_path, 1500)).await {
            Ok(Ok(data)) => data,
            Ok(Err(err)) => {
                tracing::warn!(%err, %base, "Failed to compute waveform");
                return (Err(StatusCode::INTERNAL_SERVER_ERROR), false);
            }
            Err(err) => {
                tracing::error!(%err, %base, "Waveform decoding task failed");
                return (Err(StatusCode::INTERNAL_SERVER_ERROR), false);
            }
        };
        let written = match write_cache_atomically(cache_path, &data).await {
            Ok(()) => true,
            Err(err) => {
                tracing::warn!(%err, path = %cache_path.display(), "Failed to cache waveform");
                false
            }
        };
        (Ok(data), written)
    }
}

struct EntryCleanup {
    service: Arc<WaveformService>,
    entry_key: PathBuf,
    entry: Arc<InFlight>,
}

impl Drop for EntryCleanup {
    fn drop(&mut self) {
        let mut active = self
            .service
            .in_flight
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        if active
            .get(&self.entry_key)
            .is_some_and(|entry| Arc::ptr_eq(entry, &self.entry))
        {
            active.remove(&self.entry_key);
        }
    }
}

fn service() -> &'static Arc<WaveformService> {
    static SERVICE: OnceLock<Arc<WaveformService>> = OnceLock::new();
    SERVICE.get_or_init(|| WaveformService::new(Arc::new(compute_peaks)))
}

async fn read_cache(path: &Path) -> Option<WaveformData> {
    let cached = tokio::fs::read_to_string(path).await.ok()?;
    serde_json::from_str(&cached).ok()
}

async fn write_cache_atomically(path: &Path, data: &WaveformData) -> std::io::Result<()> {
    let json = serde_json::to_vec(data).map_err(std::io::Error::other)?;
    // A unique sibling file keeps readers away from partial JSON. create_new
    // also protects a temporary file left by a cancelled server shutdown.
    let temp_path = PathBuf::from(format!(
        "{}.tmp.{:032x}",
        path.display(),
        rand::random::<u128>()
    ));
    let result = async {
        let mut file = tokio::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)
            .await?;
        file.write_all(&json).await?;
        file.flush().await?;
        drop(file);
        tokio::fs::rename(&temp_path, path).await
    }
    .await;
    if result.is_err() {
        let _ = tokio::fs::remove_file(&temp_path).await;
    }
    result
}

// Peaks and duration are intentionally unchanged from the original decoder.
pub(crate) async fn get_waveform(
    axum_path((artist_id, song_id)): axum_path<(String, String)>,
) -> Result<Json<WaveformData>, StatusCode> {
    if !is_safe_segment(&artist_id) || !is_safe_segment(&song_id) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let base = format!("server_files/artists/{artist_id}/{song_id}");
    service().load(base).await.0.map(Json)
}

pub(crate) async fn pregenerate_waveforms() {
    let root = Path::new("server_files/artists");
    let generated = pregenerate_at(root, service()).await;
    println!("Waveform pre-generation done ({generated} new caches)");
}

async fn pregenerate_at(root: &Path, service: &Arc<WaveformService>) -> u32 {
    let mut artists = match tokio::fs::read_dir(root).await {
        Ok(dir) => dir,
        Err(err) => {
            tracing::warn!(%err, "Waveform pre-generation skipped");
            return 0;
        }
    };
    let mut generated = 0u32;
    while let Ok(Some(artist)) = artists.next_entry().await {
        let Ok(mut entries) = tokio::fs::read_dir(artist.path()).await else {
            continue;
        };
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            let is_audio = path
                .extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| {
                    matches!(
                        ext.to_ascii_lowercase().as_str(),
                        "wav" | "mp3" | "aac" | "aiff"
                    )
                });
            if !is_audio {
                continue;
            }
            let base = path.with_extension("").to_string_lossy().into_owned();
            let has_request_extension = AUDIO_EXTENSIONS
                .iter()
                .any(|extension| path.to_string_lossy().ends_with(extension));
            let fallback = if !has_request_extension
                && find_with_extension(&base, &AUDIO_EXTENSIONS)
                    .await
                    .is_none()
            {
                Some(path.to_string_lossy().into_owned())
            } else {
                None
            };
            let (result, cached) = service.load_with_fallback(base, fallback).await;
            if let Err(status) = result {
                tracing::warn!(%status, path = %path.display(), "Failed to pre-generate waveform");
            }
            if cached {
                generated += 1;
            }
        }
    }
    generated
}
fn compute_peaks(
    audio_path: &str,
    target_peaks: usize,
) -> Result<WaveformData, Box<dyn std::error::Error + Send + Sync>> {
    use symphonia::core::errors::Error as SymphoniaError;
    use symphonia::core::formats::TrackType;
    use symphonia::core::formats::probe::Hint;
    use symphonia::core::io::MediaSourceStream;

    let file = std::fs::File::open(audio_path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(audio_path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let mut format = symphonia::default::get_probe().probe(
        &hint,
        mss,
        Default::default(),
        Default::default(),
    )?;
    let track = format
        .default_track(TrackType::Audio)
        .ok_or("no audio track")?;
    let track_id = track.id;
    let codec_params = track
        .codec_params
        .as_ref()
        .and_then(|params| params.audio())
        .ok_or("missing audio codec parameters")?;
    let sample_rate = codec_params.sample_rate.ok_or("unknown sample rate")? as f64;
    let mut decoder =
        symphonia::default::get_codecs().make_audio_decoder(codec_params, &Default::default())?;

    //max absolute sample per fixed-size block of frames; reduced to target_peaks at the end
    const FRAMES_PER_BLOCK: usize = 1024;
    let mut block_peaks: Vec<f32> = Vec::new();
    let mut block_max = 0f32;
    let mut frames_in_block = 0usize;
    let mut total_frames = 0u64;
    let mut samples: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(Some(packet)) => packet,
            Ok(None) | Err(_) => break, //end of stream
        };
        if packet.track_id != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(SymphoniaError::DecodeError(_)) => continue, //skip corrupt packets
            Err(_) => break,
        };
        let channels = decoded.spec().channels().count().max(1);
        samples.resize(decoded.samples_interleaved(), 0.0);
        decoded.copy_to_slice_interleaved(&mut samples);
        for frame in samples.chunks(channels) {
            for sample in frame {
                block_max = block_max.max(sample.abs());
            }
            frames_in_block += 1;
            total_frames += 1;
            if frames_in_block == FRAMES_PER_BLOCK {
                block_peaks.push(block_max);
                block_max = 0.0;
                frames_in_block = 0;
            }
        }
    }
    if frames_in_block > 0 {
        block_peaks.push(block_max);
    }
    if block_peaks.is_empty() {
        return Err("no audio data decoded".into());
    }

    //downsample the per-block maxima to the requested number of peaks
    let peaks: Vec<f32> = if block_peaks.len() <= target_peaks {
        block_peaks
    } else {
        (0..target_peaks)
            .map(|i| {
                let start = i * block_peaks.len() / target_peaks;
                let end = (((i + 1) * block_peaks.len()) / target_peaks).max(start + 1);
                block_peaks[start..end].iter().copied().fold(0f32, f32::max)
            })
            .collect()
    };
    //normalize so the loudest peak is 1.0
    let loudest = peaks.iter().copied().fold(0f32, f32::max).max(f32::EPSILON);
    let peaks = peaks.iter().map(|p| p / loudest).collect();

    Ok(WaveformData {
        peaks,
        duration: total_frames as f64 / sample_rate,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Condvar;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::Duration;

    struct TestDir(PathBuf);
    impl TestDir {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "knowledge-waveform-test-{:032x}",
                rand::random::<u128>()
            ));
            std::fs::create_dir_all(&path).unwrap();
            Self(path)
        }
        async fn song(&self, name: &str) -> String {
            let base = self.0.join(name).to_string_lossy().into_owned();
            tokio::fs::write(format!("{base}.wav"), b"test audio")
                .await
                .unwrap();
            base
        }
    }
    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn expected() -> WaveformData {
        WaveformData {
            peaks: vec![0.25, 1.0],
            duration: 2.5,
        }
    }

    #[test]
    fn decodes_stereo_pcm_into_frame_based_duration_and_normalized_peaks() {
        let directory = TestDir::new();
        let path = directory.0.join("stereo.wav");
        let mut pcm = Vec::new();
        for frame in 0..2048 {
            let (left, right): (i16, i16) = if frame < 1024 {
                (8192, 16384)
            } else {
                (32767, 0)
            };
            pcm.extend_from_slice(&left.to_le_bytes());
            pcm.extend_from_slice(&right.to_le_bytes());
        }
        let data_len = pcm.len() as u32;
        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&(36 + data_len).to_le_bytes());
        wav.extend_from_slice(b"WAVEfmt ");
        wav.extend_from_slice(&16u32.to_le_bytes());
        wav.extend_from_slice(&1u16.to_le_bytes()); // PCM
        wav.extend_from_slice(&2u16.to_le_bytes()); // stereo
        wav.extend_from_slice(&1024u32.to_le_bytes()); // sample rate
        wav.extend_from_slice(&4096u32.to_le_bytes()); // bytes per second
        wav.extend_from_slice(&4u16.to_le_bytes()); // bytes per frame
        wav.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&data_len.to_le_bytes());
        wav.extend_from_slice(&pcm);
        std::fs::write(&path, wav).unwrap();

        let decoded = compute_peaks(path.to_str().unwrap(), 2).unwrap();
        assert_eq!(decoded.duration, 2.0);
        assert_eq!(decoded.peaks.len(), 2);
        assert!((decoded.peaks[0] - 16384.0 / 32767.0).abs() < 0.0001);
        assert_eq!(decoded.peaks[1], 1.0);
    }

    struct Gate(Mutex<bool>, Condvar);
    struct ReleaseOnDrop(Arc<Gate>);
    impl Drop for ReleaseOnDrop {
        fn drop(&mut self) {
            self.0.release();
        }
    }
    impl Gate {
        fn new() -> Arc<Self> {
            Arc::new(Self(Mutex::new(false), Condvar::new()))
        }
        fn wait(&self) {
            let guard = self.0.lock().unwrap();
            drop(self.1.wait_while(guard, |released| !*released).unwrap());
        }
        fn release(&self) {
            *self.0.lock().unwrap() = true;
            self.1.notify_all();
        }
    }

    async fn wait_for_calls(calls: &AtomicUsize, expected: usize) {
        tokio::time::timeout(Duration::from_secs(5), async {
            while calls.load(Ordering::SeqCst) < expected {
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn cold_requests_share_decode_and_cache_hit_skips_decoder() {
        let dir = TestDir::new();
        let base = dir.song("track").await;
        let calls = Arc::new(AtomicUsize::new(0));
        let gate = Gate::new();
        let _release_on_failure = ReleaseOnDrop(Arc::clone(&gate));
        let service = WaveformService::new(Arc::new({
            let calls = Arc::clone(&calls);
            let gate = Arc::clone(&gate);
            move |_, _| {
                calls.fetch_add(1, Ordering::SeqCst);
                gate.wait();
                Ok(expected())
            }
        }));
        let first = tokio::spawn({
            let service = Arc::clone(&service);
            let base = base.clone();
            async move { service.load(base).await }
        });
        wait_for_calls(&calls, 1).await;
        let mut second = tokio::spawn({
            let service = Arc::clone(&service);
            let base = base.clone();
            async move { service.load(base).await }
        });
        assert!(
            tokio::time::timeout(Duration::from_millis(50), &mut second)
                .await
                .is_err()
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        gate.release();
        assert_eq!(first.await.unwrap().0.unwrap(), expected());
        assert_eq!(second.await.unwrap().0.unwrap(), expected());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(service.load(base.clone()).await.0.unwrap(), expected());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            read_cache(Path::new(&format!("{base}.waveform.json"))).await,
            Some(expected())
        );
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn unrelated_songs_can_decode_while_one_is_blocked() {
        let dir = TestDir::new();
        let slow = dir.song("slow").await;
        let fast = dir.song("fast").await;
        let calls = Arc::new(AtomicUsize::new(0));
        let gate = Gate::new();
        let _release_on_failure = ReleaseOnDrop(Arc::clone(&gate));
        let service = WaveformService::new(Arc::new({
            let calls = Arc::clone(&calls);
            let gate = Arc::clone(&gate);
            move |path, _| {
                calls.fetch_add(1, Ordering::SeqCst);
                if path.contains("slow.wav") {
                    gate.wait();
                }
                Ok(expected())
            }
        }));
        let first = tokio::spawn({
            let service = Arc::clone(&service);
            async move { service.load(slow).await }
        });
        wait_for_calls(&calls, 1).await;
        assert_eq!(
            tokio::time::timeout(Duration::from_secs(2), service.load(fast))
                .await
                .unwrap()
                .0
                .unwrap(),
            expected()
        );
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        gate.release();
        assert_eq!(first.await.unwrap().0.unwrap(), expected());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn invalid_cache_is_replaced_and_failure_can_retry() {
        let dir = TestDir::new();
        let base = dir.song("track").await;
        let cache = format!("{base}.waveform.json");
        tokio::fs::write(&cache, b"{broken json").await.unwrap();
        let calls = Arc::new(AtomicUsize::new(0));
        let service = WaveformService::new(Arc::new({
            let calls = Arc::clone(&calls);
            move |_, _| {
                if calls.fetch_add(1, Ordering::SeqCst) == 0 {
                    Err("deliberate decode failure".into())
                } else {
                    Ok(expected())
                }
            }
        }));
        assert_eq!(
            service.load(base.clone()).await.0.unwrap_err(),
            StatusCode::INTERNAL_SERVER_ERROR
        );
        assert!(read_cache(Path::new(&cache)).await.is_none());
        assert_eq!(service.load(base.clone()).await.0.unwrap(), expected());
        assert_eq!(read_cache(Path::new(&cache)).await, Some(expected()));
        assert_eq!(service.load(base).await.0.unwrap(), expected());
        assert_eq!(calls.load(Ordering::SeqCst), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn cancelled_request_does_not_abandon_decode() {
        let dir = TestDir::new();
        let base = dir.song("track").await;
        let calls = Arc::new(AtomicUsize::new(0));
        let gate = Gate::new();
        let _release_on_failure = ReleaseOnDrop(Arc::clone(&gate));
        let service = WaveformService::new(Arc::new({
            let calls = Arc::clone(&calls);
            let gate = Arc::clone(&gate);
            move |_, _| {
                calls.fetch_add(1, Ordering::SeqCst);
                gate.wait();
                Ok(expected())
            }
        }));
        let first = tokio::spawn({
            let service = Arc::clone(&service);
            let base = base.clone();
            async move { service.load(base).await }
        });
        wait_for_calls(&calls, 1).await;
        first.abort();
        let mut second = tokio::spawn({
            let service = Arc::clone(&service);
            let base = base.clone();
            async move { service.load(base).await }
        });
        assert!(
            tokio::time::timeout(Duration::from_millis(50), &mut second)
                .await
                .is_err()
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        gate.release();
        assert_eq!(second.await.unwrap().0.unwrap(), expected());
        tokio::task::yield_now().await;
        assert!(service.in_flight.lock().unwrap().is_empty());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn startup_warming_and_request_share_same_work() {
        let dir = TestDir::new();
        let artist = dir.0.join("artist");
        tokio::fs::create_dir_all(&artist).await.unwrap();
        let base = artist.join("track").to_string_lossy().into_owned();
        tokio::fs::write(format!("{base}.wav"), b"test audio")
            .await
            .unwrap();
        let calls = Arc::new(AtomicUsize::new(0));
        let gate = Gate::new();
        let _release_on_failure = ReleaseOnDrop(Arc::clone(&gate));
        let service = WaveformService::new(Arc::new({
            let calls = Arc::clone(&calls);
            let gate = Arc::clone(&gate);
            move |_, _| {
                calls.fetch_add(1, Ordering::SeqCst);
                gate.wait();
                Ok(expected())
            }
        }));
        let warming = tokio::spawn({
            let root = dir.0.clone();
            let service = Arc::clone(&service);
            async move { pregenerate_at(&root, &service).await }
        });
        wait_for_calls(&calls, 1).await;
        let mut request = tokio::spawn({
            let service = Arc::clone(&service);
            let base = base.clone();
            async move { service.load(base).await }
        });
        assert!(
            tokio::time::timeout(Duration::from_millis(50), &mut request)
                .await
                .is_err()
        );
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        gate.release();
        assert_eq!(request.await.unwrap().0.unwrap(), expected());
        assert_eq!(warming.await.unwrap(), 1);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert!(
            tokio::fs::try_exists(format!("{base}.waveform.json"))
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn startup_keeps_case_insensitive_audio_extensions() {
        let dir = TestDir::new();
        let artist = dir.0.join("artist");
        tokio::fs::create_dir(&artist).await.unwrap();
        for name in ["upper.WAV", "mixed.Mp3"] {
            tokio::fs::write(artist.join(name), b"test audio")
                .await
                .unwrap();
        }
        let calls = Arc::new(AtomicUsize::new(0));
        let service = WaveformService::new(Arc::new({
            let calls = calls.clone();
            move |path, _| {
                // macOS may resolve the canonical lowercase probe on its
                // case-insensitive filesystem; Linux uses the scanned fallback.
                let path = path.to_ascii_lowercase();
                assert!(path.ends_with("upper.wav") || path.ends_with("mixed.mp3"));
                calls.fetch_add(1, Ordering::SeqCst);
                Ok(expected())
            }
        }));
        let base = artist.join("upper").to_string_lossy().into_owned();
        assert_eq!(pregenerate_at(&dir.0, &service).await, 2);
        assert_eq!(service.load(base).await.0.unwrap(), expected());
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        assert!(service.in_flight.lock().unwrap().is_empty());
    }
}
