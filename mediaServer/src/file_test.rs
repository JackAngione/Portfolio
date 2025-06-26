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

    let extensions = [".wav", ".mp3", ".AAC", ".AIFF"];
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
