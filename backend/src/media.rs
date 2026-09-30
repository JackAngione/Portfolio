//! Filesystem-backed media routes and photo uploads.
use crate::AxumState;
use axum::body::Body;
use axum::extract::{Multipart, State};
use axum::http::{HeaderMap, header};
use axum::{
    Json,
    extract::Path as axum_path,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use mongodb::bson::doc;
use rand::rng;
use rand::seq::SliceRandom;
use std::path::Path;
use tokio::io::BufReader;
use tokio_util::io::ReaderStream;
use tower::util::ServiceExt;
use tower_http::services::ServeFile;

//THESE FUNCTIONS INTERACT WITH THE FILE SYSTEM

//path params are interpolated into filesystem paths; reject anything that
//could escape the intended directory (e.g. "..", "../..", encoded slashes)
pub(crate) fn is_safe_segment(segment: &str) -> bool {
    !segment.is_empty()
        && !segment.contains("..")
        && !segment.contains('/')
        && !segment.contains('\\')
        && !segment.contains('\0')
}

//given a base path with no extension, find the first extension that exists on disk
pub(crate) async fn find_with_extension(base: &str, extensions: &[&str]) -> Option<String> {
    for extension in extensions {
        let path = format!("{base}{extension}");
        if tokio::fs::try_exists(&path).await.unwrap_or(false) {
            return Some(path);
        }
    }
    None
}

pub(crate) const AUDIO_EXTENSIONS: [&str; 6] = [".wav", ".mp3", ".aac", ".AAC", ".aiff", ".AIFF"];

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
    let Some(pathbuilder) = find_with_extension(&base, &extensions).await else {
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
    let pathbuilder = find_with_extension(&base, &AUDIO_EXTENSIONS)
        .await
        .ok_or(StatusCode::NOT_FOUND)?;
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

pub(crate) async fn get_categories() -> Result<Json<Vec<String>>, StatusCode> {
    let path = crate::dev_config::photo_root();
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
        //skip sub-directories
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
    }
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return Some("jpg");
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
//long edge) and low-res (1200px) image pair, or generateLowRes=true.
//The gallery lists category/low/; originals live in category/high/
//under the same filename (including extension).
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
    let mut generate_low_res = false;
    //(sanitized filename stem, file bytes)
    let mut high_res: Option<(String, axum::body::Bytes)> = None;
    let mut low_res: Option<(String, axum::body::Bytes)> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| bad_request(&format!("malformed multipart body: {err}")))?
    {
        match field.name() {
            Some("generateLowRes") => {
                generate_low_res = match field.text().await.as_deref() {
                    Ok("true") => true,
                    Ok("false") => false,
                    _ => return Err(bad_request("generateLowRes must be true or false")),
                };
            }
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

    //both files must actually be images (only JPEG and AVIF accepted)
    let high_ext = image_extension(&high_bytes)
        .ok_or_else(|| bad_request("highRes is not a supported image (JPEG or AVIF only)"))?;
    let low_bytes = if generate_low_res {
        if low_res.is_some() {
            return Err(bad_request("provide lowRes or generateLowRes, not both"));
        }
        if !matches!(high_ext, "jpg" | "avif") {
            return Err(bad_request(
                "automatic resizing supports JPEG and AVIF only",
            ));
        }
        crate::photo_resize::downscale(&high_bytes, high_ext)
            .await?
            .into()
    } else {
        low_res
            .ok_or_else(|| bad_request("missing lowRes image"))?
            .1
    };
    let low_ext = image_extension(&low_bytes)
        .ok_or_else(|| bad_request("lowRes is not a supported image (JPEG or AVIF only)"))?;

    let category_dir = format!("{}/{}", crate::dev_config::photo_root().display(), category);
    if low_ext != high_ext {
        return Err(bad_request(
            "highRes and lowRes must use the same image format so their filenames match",
        ));
    }
    let low_dir = format!("{}/low", category_dir);
    let high_dir = format!("{}/high", category_dir);
    for directory in [&low_dir, &high_dir] {
        tokio::fs::create_dir_all(directory).await.map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("could not create photo folder: {err}"),
            )
        })?;
    }

    //the pair shares the exact filename across low/ and high/
    let low_path = format!("{}/{}.{}", low_dir, stem, low_ext);
    let high_path = format!("{}/{}.{}", high_dir, stem, high_ext);
    // Keep the blocking filesystem transaction running through verification/cleanup
    // even if the HTTP client disconnects while it is being saved.
    tokio::task::spawn_blocking(move || {
        crate::photo_storage::save_pair(
            Path::new(&high_path),
            &high_bytes,
            Path::new(&low_path),
            &low_bytes,
        )
    })
    .await
    .map_err(|err| {
        tracing::error!(%err, "Photo save task failed");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not confirm both photo copies were saved".to_string(),
        )
    })?
    .map_err(|err| {
        if err.kind() == std::io::ErrorKind::AlreadyExists {
            (
                StatusCode::CONFLICT,
                format!("\"{}\" already exists in \"{}\"", stem, category),
            )
        } else {
            tracing::error!(%err, "Photo pair save/verification failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("{err}. Neither photo copy was confirmed as uploaded."),
            )
        }
    })?;
    Ok(StatusCode::CREATED)
}

pub(crate) async fn get_category_photos(
    axum_path(category): axum_path<String>,
) -> Result<Json<Vec<String>>, StatusCode> {
    if !is_safe_segment(&category) {
        return Err(StatusCode::BAD_REQUEST);
    }
    let pathbuilder = format!(
        "{}/{}/low",
        crate::dev_config::photo_root().display(),
        category
    );
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

#[cfg(test)]
mod photo_type_tests {
    use super::image_extension;

    #[test]
    fn accepts_only_jpeg_and_avif_signatures() {
        assert_eq!(image_extension(&[0xff, 0xd8, 0xff, 0xe0]), Some("jpg"));
        assert_eq!(image_extension(b"\0\0\0\x18ftypavif"), Some("avif"));
        assert_eq!(image_extension(b"\0\0\0\x18ftypavis"), Some("avif"));
        assert_eq!(image_extension(b"\x89PNG\r\n\x1a\n"), None);
        assert_eq!(image_extension(b"RIFF\0\0\0\0WEBP"), None);
        assert_eq!(image_extension(b"GIF89a"), None);
        assert_eq!(image_extension(b"not an image.jpg"), None);
        assert_eq!(image_extension(b""), None);
    }
}

#[cfg(test)]
mod extension_lookup_tests {
    use super::find_with_extension;
    use std::path::PathBuf;

    struct TestDir(PathBuf);
    impl TestDir {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "extension-lookup-test-{:032x}",
                rand::random::<u128>()
            ));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
    }
    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[tokio::test]
    async fn finds_first_existing_extension_in_priority_order() {
        let dir = TestDir::new();
        let base = dir.0.join("audio").to_string_lossy().into_owned();
        tokio::fs::write(format!("{base}.mp3"), b"mp3")
            .await
            .unwrap();
        tokio::fs::write(format!("{base}.wav"), b"wav")
            .await
            .unwrap();

        assert_eq!(
            find_with_extension(&base, &[".wav", ".mp3"]).await,
            Some(format!("{base}.wav"))
        );
        assert_eq!(
            find_with_extension(&base, &[".aac", ".mp3"]).await,
            Some(format!("{base}.mp3"))
        );
    }

    #[tokio::test]
    async fn missing_files_and_directory_return_none() {
        let dir = TestDir::new();
        let missing = dir.0.join("missing").to_string_lossy().into_owned();
        let missing_parent = dir
            .0
            .join("absent/folder/audio")
            .to_string_lossy()
            .into_owned();

        assert_eq!(find_with_extension(&missing, &[".wav", ".mp3"]).await, None);
        assert_eq!(find_with_extension(&missing_parent, &[".wav"]).await, None);
    }
}
