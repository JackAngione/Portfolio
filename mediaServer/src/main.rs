use crate::file_test::get_artwork;
use crate::mongoDB::Song;
use axum::extract::ConnectInfo;
use axum::http::{header, Request};
use axum::middleware::Next;
use axum::response::Response;
use axum::routing::{get, post};
use axum::{debug_handler, middleware, Router};
use dotenvy::dotenv;
use mongodb::options::ClientOptions;
use mongodb::{Client, Collection, Database};
use std::env;
use std::net::SocketAddr;
use std::path::Path;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
// For request/response tracing
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
    let client_options = ClientOptions::parse(&mongoDB_connection_string.unwrap())
        .await
        .expect("MongoDB connection string is invalid");
    let mongo_client = Client::with_options(client_options).unwrap();
    // Get the music collection
    let mongo_database = mongo_client.database("KNOWLEDGE");
    let song_collection: Collection<Song> = mongo_database.collection::<Song>("songs");

    AxumState {
        mongo_database,
        song_collection,
    }
}
#[tokio::main]
async fn main() {
    // Initialize tracing (for logging)
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "example_log_ip=info,tower_http=info".into()), // Adjust log levels as needed
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    //allows the mongo client or collection to be passed among route functions
    let state = init_mongo_client().await;

    //STATIC FILE SERVING PATHS
    let images_path = Path::new("./server_files/hdrImages");
    let serve_images = ServeDir::new(images_path);

    let album_covers = Path::new("./server_files/fav_album_covers");
    let serve_album_covers = ServeDir::new(album_covers);
    //
    // Configure CORS middleware to allow all origins
    let cors = CorsLayer::new()
        .allow_origin(Any) // Allow requests from any origin
        .allow_methods(Any) // Allow all HTTP methods
        .allow_headers(Any) // Allow all HTTP headers
        .expose_headers([
            header::CONTENT_LENGTH,
            header::CONTENT_TYPE,
            header::ACCEPT_RANGES,
        ]);
    // Build our application with a route
    let app = Router::new()
        .route("/artwork/{song_id}", get(file_test::get_artwork))
        .route("/stream/{artist}/{songname}", get(file_test::stream_song))
        .route("/getSongs", get(mongoDB::get_songs))
        .route("/artist/{artist_id}", get(mongoDB::get_artist_songs))
        .route("/artists", get(mongoDB::get_artists))
        .route("/getPhotoCategories", get(file_test::get_categories))
        .route(
            "/getPhotoInCategory/{category}",
            get(file_test::get_category_photos),
        )
        .route("/getAlbumCovers", get(file_test::get_album_covers))
        .route("/resume", get(file_test::get_resume))
        .nest_service("/photo", serve_images) // Static file route
        .nest_service("/album_covers", serve_album_covers)
        .layer(middleware::from_fn(log_ip_middleware))
        //.route("/artwork/", get(file_test::get_artwork))
        .layer(cors)
        .with_state(state);

    // Run it with hyper on localhost:3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:2121").await.unwrap();
    println!("Server running on localhost:2121");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}
// Middleware function (from step 2)
async fn log_ip_middleware(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    //println!("Logging request from {:?}", addr);
    tracing::info!("Received request from IP: {}", addr);
    next.run(request).await
}
