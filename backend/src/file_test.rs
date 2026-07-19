use crate::AxumState;
use axum::body::Body;
use axum::extract::{Multipart, State};
use axum::http::{header, HeaderMap};
use axum::{
    extract::Path as axum_path,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use mongodb::bson::doc;
use rand::rng;
use rand::seq::SliceRandom;
use std::fs::exists;
use std::path::Path;
use tokio::io::BufReader;
use tokio_util::io::ReaderStream;
use tower::util::ServiceExt;
use tower_http::services::ServeFile;

//THESE FUNCTIONS INTERACT WITH THE FILE SYSTEM

//path params are interpolated into filesystem paths; reject anything that
//could escape the intended directory (e.g. "..", "../..", encoded slashes)
fn is_safe_segment(segment: &str) -> bool {
    !segment.is_empty()
        && !segment.contains("..")
        && !segment.contains('/')
        && !segment.contains('\\')
        && !segment.contains('\0')
}

//given a base path with no extension, find the first extension that exists on disk
fn find_with_extension(base: &str, extensions: &[&str]) -> Option<String> {
    extensions
        .iter()
        .map(|ext| format!("{}{}", base, ext))
        .find(|path| exists(path).unwrap_or(false))
}

const AUDIO_EXTENSIONS: [&str; 6] = [".wav", ".mp3", ".aac", ".AAC", ".aiff", ".AIFF"];

pub(crate) async fn get_artwork(
    State(state): State<AxumState>,
    axum_path(song_id): axum_path<String>,
) -> Response<Body> {
    let not_found = || {
        axum::http::Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::empty())
            .unwrap()
    };
    //pull the song information from database to create a "verified" file path
    let Ok(song_document) = state
        .song_collection
        .find_one(doc! {"song_id": song_id})
        .await
    else {
        return axum::http::Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(Body::empty())
            .unwrap();
    };
    //unknown song id: no artwork
    let Some(song) = song_document else {
        return not_found();
    };

    //IF SONG IS PART OF AN ALBUM, USE THE ALBUM ARTWORK
    let base = if song.album != "" {
        format!("server_files/artists/{}/{}", song.artist_id, song.album)
    } else {
        format!("server_files/artists/{}/{}", song.artist_id, song.song_id)
    };

    let extensions = [".png", ".jpg", ".jpeg", ".webp", ".avif"];
    let Some(pathbuilder) = find_with_extension(&base, &extensions) else {
        println!("Artwork file does not exist: {}", &base);
        return not_found();
    };

    let path = Path::new(&pathbuilder);
    let file = tokio::fs::File::open(path).await;
    //catches file opening errors
    match file {
        Ok(file) => {
            let content_length = match file.metadata().await {
                Ok(metadata) => metadata.len(),
                Err(_) => return not_found(),
            };

            let reader = BufReader::new(file);
            // Convert the file into a stream
            let stream = ReaderStream::new(reader);

            // Determine content type based on file extension
            let content_type = match path.extension().and_then(|ext| ext.to_str()) {
                Some("jpg") | Some("jpeg") => "image/jpeg",
                Some("png") => "image/png",
                Some("webp") => "image/webp",
                Some("avif") => "image/avif",
                _ => "application/octet-stream", // Fallback
            };

            // convert the `Stream` into an `axum::body::HttpBody`
            let body = Body::from_stream(stream);

            axum::http::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, content_type)
                .header(header::CONTENT_LENGTH, content_length)
                .body(body)
                .unwrap()
        }
        Err(..) => {
            println!("Artwork file does not exist: {}", &pathbuilder);
            not_found()
        }
    }
}
pub(crate) async fn stream_song(
    axum_path((artist_id, song_id)): axum_path<(String, String)>,
    req: axum::extract::Request,
) -> Result<Response, StatusCode> {
    if !is_safe_segment(&artist_id) || !is_safe_segment(&song_id) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let base = format!("server_files/artists/{}/{}", artist_id, song_id);
    let pathbuilder =
        find_with_extension(&base, &AUDIO_EXTENSIONS).ok_or(StatusCode::NOT_FOUND)?;
    let path = Path::new(&pathbuilder);

    // Use tower-http's ServeFile which handles range requests
    match ServeFile::new(&path).oneshot(req).await {
        Ok(response) => Ok(response.into_response()),
        Err(err) => {
            println!("Failed to serve file {}: {}", pathbuilder, err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub(crate) struct WaveformData {
    peaks: Vec<f32>,
    duration: f64,
}

//Returns pre-computed peaks for the full song so the client can draw the
//waveform without downloading/decoding the audio file. Peaks are computed once
//and cached as a .waveform.json file next to the audio file.
pub(crate) async fn get_waveform(
    axum_path((artist_id, song_id)): axum_path<(String, String)>,
) -> Result<Json<WaveformData>, StatusCode> {
    if !is_safe_segment(&artist_id) || !is_safe_segment(&song_id) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let base = format!("server_files/artists/{}/{}", artist_id, song_id);
    let cache_path = format!("{}.waveform.json", base);

    if let Ok(cached) = tokio::fs::read_to_string(&cache_path).await {
        if let Ok(data) = serde_json::from_str::<WaveformData>(&cached) {
            return Ok(Json(data));
        }
    }

    let audio_path =
        find_with_extension(&base, &AUDIO_EXTENSIONS).ok_or(StatusCode::NOT_FOUND)?;

    //decoding the whole file is CPU-bound, keep it off the async runtime
    let data = tokio::task::spawn_blocking(move || compute_peaks(&audio_path, 1500))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map_err(|err| {
            println!("Failed to compute waveform for {}: {}", &base, err);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if let Ok(json) = serde_json::to_string(&data) {
        let _ = tokio::fs::write(&cache_path, json).await;
    }
    Ok(Json(data))
}

//scans every artist folder on startup and computes any missing waveform
//caches, so no song pays the decode cost on its first play
pub(crate) async fn pregenerate_waveforms() {
    let mut artists = match tokio::fs::read_dir("server_files/artists").await {
        Ok(dir) => dir,
        Err(err) => {
            println!("Waveform pre-generation skipped: {}", err);
            return;
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
            let cache_path = path.with_extension("waveform.json");
            if tokio::fs::try_exists(&cache_path).await.unwrap_or(false) {
                continue;
            }
            let audio_path = path.to_string_lossy().into_owned();
            //decode one file at a time on a blocking thread to keep the
            //async runtime responsive while the server is already serving
            match tokio::task::spawn_blocking(move || compute_peaks(&audio_path, 1500)).await {
                Ok(Ok(data)) => {
                    if let Ok(json) = serde_json::to_string(&data) {
                        let _ = tokio::fs::write(&cache_path, json).await;
                        generated += 1;
                    }
                }
                Ok(Err(err)) => {
                    println!("Failed to pre-generate waveform for {}: {}", path.display(), err)
                }
                Err(err) => println!("Waveform pre-generation task panicked: {}", err),
            }
        }
    }
    println!("Waveform pre-generation done ({} new caches)", generated);
}

fn compute_peaks(
    audio_path: &str,
    target_peaks: usize,
) -> Result<WaveformData, Box<dyn std::error::Error + Send + Sync>> {
    use symphonia::core::audio::SampleBuffer;
    use symphonia::core::errors::Error as SymphoniaError;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::probe::Hint;

    let file = std::fs::File::open(audio_path)?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = Path::new(audio_path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe().format(
        &hint,
        mss,
        &Default::default(),
        &Default::default(),
    )?;
    let mut format = probed.format;
    let track = format.default_track().ok_or("no audio track")?;
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.ok_or("unknown sample rate")? as f64;
    let mut decoder =
        symphonia::default::get_codecs().make(&track.codec_params, &Default::default())?;

    //max absolute sample per fixed-size block of frames; reduced to target_peaks at the end
    const FRAMES_PER_BLOCK: usize = 1024;
    let mut block_peaks: Vec<f32> = Vec::new();
    let mut block_max = 0f32;
    let mut frames_in_block = 0usize;
    let mut total_frames = 0u64;
    let mut sample_buf: Option<SampleBuffer<f32>> = None;

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(_) => break, //end of stream
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(SymphoniaError::DecodeError(_)) => continue, //skip corrupt packets
            Err(_) => break,
        };
        let channels = decoded.spec().channels.count().max(1);
        if sample_buf.is_none() {
            sample_buf = Some(SampleBuffer::new(decoded.capacity() as u64, *decoded.spec()));
        }
        let buf = sample_buf.as_mut().unwrap();
        buf.copy_interleaved_ref(decoded);
        for frame in buf.samples().chunks(channels) {
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

pub(crate) async fn get_categories() -> Result<Json<Vec<String>>, StatusCode> {
    let path = Path::new("./server_files/hdrImages");
    let mut hdr_images_folder = tokio::fs::read_dir(path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut image_files: Vec<String> = Vec::new();
    while let Ok(Some(category)) = hdr_images_folder.next_entry().await {
        //check if current entry is a folder (category)
        let category_check = match category.file_type().await {
            Ok(file_type) => file_type.is_dir(),
            Err(_) => false, //if this is false, something is wrong with the file lol
        };
        if category_check {
            if let Ok(name) = category.file_name().into_string() {
                image_files.push(name);
            }
        }
    }
    Ok(Json(image_files))
}

//lists the plain files in a directory (skipping .DS_Store) in shuffled order
async fn list_dir_shuffled(path: &Path) -> Result<Vec<String>, StatusCode> {
    //if given an invalid directory, return NOT FOUND status code
    let mut folder = tokio::fs::read_dir(path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let mut files: Vec<String> = Vec::new();
    while let Ok(Some(entry)) = folder.next_entry().await {
        if entry.file_name() == ".DS_Store" {
            continue;
        }
        //skip sub-directories (e.g. a category's fullres/ folder)
        if entry.file_type().await.map(|t| t.is_dir()).unwrap_or(true) {
            continue;
        }
        if let Ok(name) = entry.file_name().into_string() {
            files.push(name);
        }
    }
    //Shuffle order of images
    let mut rng = rng();
    files.shuffle(&mut rng);
    Ok(files)
}

//sniff the real image type from magic bytes; the client-supplied content type
//and file extension can lie
fn image_extension(bytes: &[u8]) -> Option<&'static str> {
    if bytes.len() >= 12 {
        if &bytes[4..8] == b"ftyp" && (&bytes[8..12] == b"avif" || &bytes[8..12] == b"avis") {
            return Some("avif");
        }
        if &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
            return Some("webp");
        }
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("jpg");
    }
    if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        return Some("png");
    }
    None
}

//keep only filesystem-safe characters from an uploaded file's name
fn sanitized_stem(filename: &str) -> Option<String> {
    let stem = Path::new(filename).file_stem()?.to_str()?;
    let clean: String = stem
        .trim()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    (!clean.is_empty() && clean != "_").then_some(clean)
}

//Admin-only. Accepts a multipart form with a category plus a high-res (2500px
//long edge) and low-res (1200px) image pair. The low-res copy lands in the
//category folder (what the gallery grid lists/serves); the high-res copy lands
//in the category's fullres/ sub-folder under the same name.
pub(crate) async fn upload_photo(
    State(state): State<AxumState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<StatusCode, (StatusCode, String)> {
    if !crate::knowledge::verify_token(&state, &headers).await {
        return Err((StatusCode::UNAUTHORIZED, "unauthorized".to_string()));
    }
    let bad_request = |message: &str| (StatusCode::BAD_REQUEST, message.to_string());

    let mut category: Option<String> = None;
    //(sanitized filename stem, file bytes)
    let mut high_res: Option<(String, axum::body::Bytes)> = None;
    let mut low_res: Option<(String, axum::body::Bytes)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| bad_request(&format!("malformed multipart body: {err}")))?
    {
        match field.name() {
            Some("category") => {
                category = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| bad_request("category must be text"))?,
                );
            }
            Some(name @ ("highRes" | "lowRes")) => {
                let is_high = name == "highRes";
                let stem = field
                    .file_name()
                    .and_then(sanitized_stem)
                    .ok_or_else(|| bad_request("image file needs a usable file name"))?;
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|err| bad_request(&format!("failed to read image: {err}")))?;
                if is_high {
                    high_res = Some((stem, bytes));
                } else {
                    low_res = Some((stem, bytes));
                }
            }
            _ => {}
        }
    }

    let category = category
        .filter(|c| is_safe_segment(c))
        .ok_or_else(|| bad_request("missing or invalid category"))?;
    let (stem, high_bytes) = high_res.ok_or_else(|| bad_request("missing highRes image"))?;
    let (_, low_bytes) = low_res.ok_or_else(|| bad_request("missing lowRes image"))?;

    //both files must actually be images (AVIF preferred, jpg/png/webp accepted)
    let high_ext = image_extension(&high_bytes)
        .ok_or_else(|| bad_request("highRes is not a supported image (avif/jpg/png/webp)"))?;
    let low_ext = image_extension(&low_bytes)
        .ok_or_else(|| bad_request("lowRes is not a supported image (avif/jpg/png/webp)"))?;

    let category_dir = format!("./server_files/hdrImages/{}", category);
    let fullres_dir = format!("{}/fullres", category_dir);
    tokio::fs::create_dir_all(&fullres_dir).await.map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("could not create category folder: {err}"),
        )
    })?;

    //the pair shares one name: low-res in the category folder, high-res in fullres/
    let low_path = format!("{}/{}.{}", category_dir, stem, low_ext);
    let high_path = format!("{}/{}.{}", fullres_dir, stem, high_ext);
    for path in [&low_path, &high_path] {
        if tokio::fs::try_exists(path).await.unwrap_or(false) {
            return Err((
                StatusCode::CONFLICT,
                format!("\"{}\" already exists in \"{}\"", stem, category),
            ));
        }
    }

    let write_error = |err: std::io::Error| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("failed to save image: {err}"),
        )
    };
    tokio::fs::write(&low_path, &low_bytes)
        .await
        .map_err(write_error)?;
    if let Err(err) = tokio::fs::write(&high_path, &high_bytes).await {
        //don't leave a half-uploaded pair behind
        let _ = tokio::fs::remove_file(&low_path).await;
        return Err(write_error(err));
    }
    println!("Photo uploaded: {} (+ fullres)", low_path);
    Ok(StatusCode::CREATED)
}

pub(crate) async fn get_category_photos(
    axum_path(category): axum_path<String>,
) -> Result<Json<Vec<String>>, StatusCode> {
    if !is_safe_segment(&category) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let pathbuilder = format!("./server_files/hdrImages/{}", category);
    let photo_files = list_dir_shuffled(Path::new(&pathbuilder)).await?;
    Ok(Json(photo_files))
}

pub(crate) async fn get_album_covers() -> Result<Json<Vec<String>>, StatusCode> {
    println!("Getting album covers");
    let path = Path::new("./server_files/fav_album_covers");
    let album_covers = list_dir_shuffled(path).await?;
    Ok(Json(album_covers))
}
pub(crate) async fn get_resume() -> Response<Body> {
    /* println!("Path with Extension: {}", pathbuilder);*/
    let path = Path::new("./server_files/jack_angione_resume.pdf");
    let file = tokio::fs::File::open(path).await;
    //catches file opening errors
    match file {
        Ok(file) => {
            let metadata = file.metadata().await.unwrap();

            let reader = BufReader::new(file);
            // Convert the file into a stream
            let stream = ReaderStream::new(reader);

            // convert the `Stream` into an `axum::body::HttpBody`
            let body = Body::from_stream(stream);

            let response = axum::http::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "application/pdf")
                .header(header::CONTENT_LENGTH, metadata.len())
                .body(body)
                .unwrap();
            response
        }
        Err(..) => {
            println!("Resume file not not found: {}", path.to_str().unwrap());
            let response = axum::http::Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty())
                .unwrap();
            response
        }
    }
}
pub(crate) async fn get_f2q() -> Response<Body> {
    /* println!("Path with Extension: {}", pathbuilder);*/
    let path = Path::new("./server_files/Filters2ProQ_v1.0.0.zip");
    let file = tokio::fs::File::open(path).await;
    //catches file opening errors
    match file {
        Ok(file) => {
            let metadata = file.metadata().await.unwrap();

            let reader = BufReader::new(file);
            // Convert the file into a stream
            let stream = ReaderStream::new(reader);

            // convert the `Stream` into an `axum::body::HttpBody`
            let body = Body::from_stream(stream);

            let response = axum::http::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "application/octet-stream")
                .header(
                    header::CONTENT_DISPOSITION,
                    "attachment; filename=Filters2ProQ_v1.0.0.zip",
                )
                .header(header::CONTENT_LENGTH, metadata.len())
                .body(body)
                .unwrap();
            response
        }
        Err(..) => {
            println!("F2Q app not not found: {}", path.to_str().unwrap());
            let response = axum::http::Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty())
                .unwrap();
            response
        }
    }
}
