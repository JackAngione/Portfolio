use crate::file_test::get_artwork;
use axum::http::header;
use axum::{debug_handler, Router};
use axum::routing::{get, post};
use tower_http::cors::{CorsLayer, Any};
use dotenvy::dotenv;
use std::env;
use mongodb::{Client, Collection, Database};
use mongodb::options::{ClientOptions};
use crate::mongoDB::Song;

mod file_test;
mod mongoDB;
#[derive(Clone)]
struct AxumState {
    mongo_database: Database,
    song_collection: Collection<Song>,
}
//set up the mongoDB client
async fn init_mongo_client() -> AxumState {
    // Load .env file
    dotenv().ok();
    let mongoDB_connection_string = env::var("MONGODB_CONNECTION_STRING");

    // Set up MongoDB client
    let client_options = ClientOptions::parse(&mongoDB_connection_string.unwrap()).await.unwrap();
    let mongo_client = Client::with_options(client_options).unwrap();
    // Get the music collection
    let mongo_database = mongo_client.database("KNOWLEDGE");
    let song_collection: Collection<Song> = mongo_database.collection::<Song>("songs");

    AxumState { mongo_database, song_collection }
}
#[tokio::main]
async fn main() {
    //allows the mongo client or collection to be passed among route functions
    let state = init_mongo_client().await;

    // Configure CORS middleware to allow all origins
    let cors = CorsLayer::new()
        .allow_origin(Any)  // Allow requests from any origin
        .allow_methods(Any) // Allow all HTTP methods
        .allow_headers(Any) // Allow all HTTP headers
        .expose_headers([header::CONTENT_LENGTH, header::CONTENT_TYPE, header::ACCEPT_RANGES]);
    // Build our application with a route
    let app = Router::new()
        .route("/artwork/{song_id}", get(file_test::get_artwork))
        .route("/stream/{artist}/{songname}", get(file_test::stream_song))
        .route("/getSongs", get(mongoDB::get_songs))
        .route("/artist/{artist_id}", get(mongoDB::get_artist_songs))
        .route("/artists", get(mongoDB::get_artists))
        //.route("/artwork/", get(file_test::get_artwork))
        .layer(cors)
        .with_state(state);

    // Run it with hyper on localhost:3000
    let listener = tokio::net::TcpListener::bind("192.168.1.204:808").await.unwrap();
    println!("Server running on 192.168.1.204:808");
    axum::serve(listener, app).await.unwrap();
}