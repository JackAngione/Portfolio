use crate::AxumState;
use axum::body::Body;
use axum::extract::State;
use axum::http::header;
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
//TODO makes sure the functions gracefully handle being given an incorrect path
pub(crate) async fn get_artwork(
    State(state): State<AxumState>,
    axum_path(song_id): axum_path<String>,
) -> Response<Body> {
    //pull the song information from database to create a "verified" file path
    let song_document = state
        .song_collection
        .find_one(doc! {"song_id": song_id})
        .await
        .unwrap();
    let song = song_document.unwrap();

    let mut pathbuilder;
    //IF SONG IS PART OF AN ALBUM, USE THE ALBUM ARTWORK
    if song.album != "" {
        pathbuilder = format!("server_files/artists/{}/{}", song.artist_id, song.album);
    } else {
        pathbuilder = format!("server_files/artists/{}/{}", song.artist_id, song.song_id);
    }

    let extensions = [".png", ".jpg", ".jpeg", ".webp", ".avif"];
    for ext in extensions.iter() {
        if exists(format!("{}{}", &pathbuilder, ext)).expect("pathbuilder exists") {
            pathbuilder = format!("{}{}", &pathbuilder, ext);
            break;
        }
    }

    /* println!("Path with Extension: {}", pathbuilder);*/
    let path = Path::new(&pathbuilder);
    let file = tokio::fs::File::open(path).await;
    //catches file opening errors
    match file {
        Ok(file) => {
            let metadata = file.metadata().await.unwrap();

            let reader = BufReader::new(file);
            // Convert the file into a stream
            let stream = ReaderStream::new(reader);

            // Determine content type based on file extension
            let content_type = match path.extension().and_then(|ext| ext.to_str()) {
                Some("jpg") | Some("jpeg") => "image/jpeg",
                Some("png") => "image/png",
                _ => "application/octet-stream", // Fallback
            };

            // convert the `Stream` into an `axum::body::HttpBody`
            let body = Body::from_stream(stream);

            let response = axum::http::Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, content_type)
                .header(header::CONTENT_LENGTH, metadata.len())
                .body(body)
                .unwrap();
            response
        }
        Err(..) => {
            println!("Artwork file does not exist: {}", &pathbuilder);
            let response = axum::http::Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty())
                .unwrap();
            response
        }
    }
}
pub(crate) async fn stream_song(
    axum_path((artist_id, song_id)): axum_path<(String, String)>,
    req: axum::extract::Request,
) -> Result<Response, String> {
    let mut pathbuilder: String = format!("server_files/artists/{}/{}", artist_id, song_id);

    let extensions = [".wav", ".mp3", ".aac", ".AAC", ".aiff", ".AIFF"];
    for ext in extensions.iter() {
        if exists(format!("{}{}", &pathbuilder, ext)).expect("pathbuilder exists") {
            pathbuilder = format!("{}{}", &pathbuilder, ext);
            break;
        }
    }
    let path = Path::new(&pathbuilder);

    /*println!("{}", &path.display());*/
    // Use tower-http's ServeFile which handles range requests
    match ServeFile::new(&path).oneshot(req).await {
        Ok(response) => Ok(response.into_response()),
        Err(err) => Err(format!("Failed to serve file: {}", err)),
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
    let base = format!("server_files/artists/{}/{}", artist_id, song_id);
    let cache_path = format!("{}.waveform.json", base);

    if let Ok(cached) = tokio::fs::read_to_string(&cache_path).await {
        if let Ok(data) = serde_json::from_str::<WaveformData>(&cached) {
            return Ok(Json(data));
        }
    }

    let extensions = [".wav", ".mp3", ".aac", ".AAC", ".aiff", ".AIFF"];
    let audio_path = extensions
        .iter()
        .map(|ext| format!("{}{}", &base, ext))
        .find(|path| exists(path).unwrap_or(false))
        .ok_or(StatusCode::NOT_FOUND)?;

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

pub(crate) async fn get_categories(req: axum::extract::Request) -> Json<Vec<String>> {
    let path = Path::new("./server_files/hdrImages");
    let mut hdr_images_folder = tokio::fs::read_dir(path).await.unwrap();
    let mut image_files: Vec<String> = Vec::new();
    while let Some(category) = hdr_images_folder.next_entry().await.unwrap() {
        //check if current entry is a folder (category)
        let category_check = match category.file_type().await {
            Ok(file_type) => file_type.is_dir(),
            Err(_) => false, //if this is false, something is wrong with the file lol
        };
        if category_check {
            image_files.push(category.file_name().into_string().unwrap());
        }
    }
    Json(image_files)
}
pub(crate) async fn get_category_photos(
    axum_path((category)): axum_path<(String)>,
) -> Result<Json<Vec<String>>, StatusCode> {
    let pathbuilder = format!("./server_files/hdrImages/{}", category);
    let path = Path::new(&pathbuilder);
    //if given invalid category, return NOT FOUND status code
    let mut category_folder = match tokio::fs::read_dir(path).await {
        Ok(dir) => dir,
        Err(e) => return Err(StatusCode::NOT_FOUND),
    };

    let mut photo_files: Vec<String> = Vec::new();
    while let Some(photo) = category_folder.next_entry().await.unwrap() {
        //check if current entry is a folder (category)
        if photo.file_name() == ".DS_Store" {
            continue;
        }
        photo_files.push(photo.file_name().into_string().unwrap());
    }
    //Shuffle order of images
    let mut rng = rng();
    photo_files.shuffle(&mut rng);
    Ok(Json(photo_files))
}

pub(crate) async fn get_album_covers() -> Result<Json<Vec<String>>, StatusCode> {
    println!("Getting album covers");
    let path = Path::new("./server_files/fav_album_covers");
    //if given invalid category, return NOT FOUND status code
    let mut album_covers_folder = match tokio::fs::read_dir(path).await {
        Ok(dir) => dir,
        Err(e) => return Err(StatusCode::NOT_FOUND),
    };

    let mut album_covers: Vec<String> = Vec::new();
    while let Some(cover) = album_covers_folder.next_entry().await.unwrap() {
        if cover.file_name() == ".DS_Store" {
            continue;
        }
        album_covers.push(cover.file_name().into_string().unwrap());
    }
    //Shuffle order of images
    let mut rng = rng();
    album_covers.shuffle(&mut rng);
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
