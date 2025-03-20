use std::fs::exists;
use tower::util::ServiceExt;
use std::path::Path;
use tokio_util::io::ReaderStream;
use axum::body::Body;
use axum::{extract::{Path as axum_path}, http::{StatusCode}, response::{IntoResponse, Response}};
use axum::extract::State;
use axum::http::{header};
use mongodb::bson::doc;
use crate::mongoDB::Song;
use tokio::io::{BufReader};
use tower_http::services::ServeFile;
use crate::AxumState;

//THESE FUNCTIONS INTERACT WITH THE FILE SYSTEM
//TODO makes sure the functions gracefully handle being given an incorrect path
pub(crate) async fn get_artwork(State(state): State<AxumState>, axum_path(song_id): axum_path<String>) -> Response<Body>
{
    //pull the song information from database to create a "verified" file path
    let song_document = state.song_collection.find_one(doc! {"song_id": song_id}).await.unwrap();
    print!("songs retrieved!");
    let song = song_document.unwrap();
    let mut pathbuilder = format!("artists/{}/{}", song.artist_id, song.song_id);

    let extensions = [".png", ".jpg", ".jpeg", ".webp", ".avif"];
    for ext in extensions.iter() {

        if exists(format!("{}{}", &pathbuilder, ext)).expect("pathbuilder exists")
        {
            pathbuilder = format!("{}{}", &pathbuilder, ext);
            break;
        }
    }

    println!("Path with Extension: {}", pathbuilder);
    let path = Path::new(&pathbuilder);
    let file = tokio::fs::File::open(path).await;
    //catches file opening errors
    match file {
        Ok(file)=> {
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
            response},
        Err(..) => {
            println!("Artwork file does not exist: {}", &pathbuilder);
            let response = axum::http::Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(Body::empty()).unwrap();
            response
        }
    }

}
pub(crate) async fn stream_song(axum_path((artist_id, song_id)): axum_path<(String, String)>, req: axum::extract::Request) -> Result<Response, String>
{
    let mut pathbuilder: String = format!("artists/{}/{}", artist_id, song_id);

    let extensions = [".wav", ".mp3", ".AAC", ".AIFF"];
    for ext in extensions.iter() {

        if exists(format!("{}{}", &pathbuilder, ext)).expect("pathbuilder exists")
        {
            pathbuilder = format!("{}{}", &pathbuilder, ext);
            break;
        }
    }
    let path = Path::new(&pathbuilder);

    println!("{}", &path.display());
    // Use tower-http's ServeFile which handles range requests
    match ServeFile::new(&path).oneshot(req).await {
        Ok(response) => Ok(response.into_response()),
        Err(err) => {
            Err(                format!("Failed to serve file: {}", err))
        }
    }
}
