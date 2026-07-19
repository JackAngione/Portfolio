use crate::mongoDB::Song;
use axum::extract::{ConnectInfo, DefaultBodyLimit};
use axum::http::{header, Request};
use axum::middleware::Next;
use axum::response::Response;
use axum::routing::{get, post, put};
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
mod knowledge;
mod mongoDB;
#[derive(Clone)]
struct AxumState {
    mongo_database: Database,
    song_collection: Collection<Song>,
    jwt_key: String,
    search_client: meilisearch_sdk::client::Client,
}
//set up the mongoDB client
async fn init_mongo_client() -> AxumState {
    // APP_ENV=development loads the committed .env.development (local Docker
    // dev stack, see backend/README.md); otherwise the gitignored .env is used.
    if env::var("APP_ENV").is_ok_and(|v| v == "development") {
        dotenvy::from_filename(".env.development").ok();
    } else {
        dotenv().ok();
    }
    let mongoDB_connection_string = env::var("MONGODB_CONNECTION_STRING");

    // Set up MongoDB client
    let client_options = ClientOptions::parse(&mongoDB_connection_string.unwrap())
        .await
        .expect("MongoDB connection string is invalid");
    let mongo_client = Client::with_options(client_options).unwrap();
    // Get the music collection
    let mongo_database = mongo_client.database("KNOWLEDGE");
    let song_collection: Collection<Song> = mongo_database.collection::<Song>("songs");

    // auto-delete blacklisted tokens once their expiration Date passes
    knowledge::create_blacklist_ttl_index(&mongo_database).await;

    let jwt_key = env::var("JWT_KEY").expect("JWT_KEY must be set");
    let search_client = meilisearch_sdk::client::Client::new(
        env::var("MEILISEARCH_HOST").unwrap_or_else(|_| "http://0.0.0.0:7700/".to_string()),
        env::var("MEILISEARCH_MASTER_KEY").ok(),
    )
    .expect("invalid meilisearch host");

    AxumState {
        mongo_database,
        song_collection,
        jwt_key,
        search_client,
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

    //mongo is the source of truth; rebuild the search index on startup so any
    //drift (failed dual-writes, meilisearch data loss) heals itself. runs in
    //the background so a slow or unreachable meilisearch can't block serving
    let reindex_state = state.clone();
    tokio::spawn(async move {
        match knowledge::reindex_meilisearch(&reindex_state).await {
            Ok(()) => println!("startup meilisearch reindex complete"),
            Err(err) => println!("startup meilisearch reindex failed: {err}"),
        }
    });

    //pre-generate any missing waveform caches in the background so no song
    //pays the decode cost on its first play
    tokio::spawn(file_test::pregenerate_waveforms());

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
        .route("/songs", get(mongoDB::get_songs))
        .route("/songs/{song_id}/artwork", get(file_test::get_artwork))
        .route("/artists", get(mongoDB::get_artists))
        .route("/artists/{artist_id}/songs", get(mongoDB::get_artist_songs))
        .route(
            "/artists/{artist_id}/songs/{song_id}/stream",
            get(file_test::stream_song),
        )
        .route(
            "/artists/{artist_id}/songs/{song_id}/waveform",
            get(file_test::get_waveform),
        )
        .route("/photo-categories", get(file_test::get_categories))
        .route(
            "/photo-categories/{category}/photos",
            get(file_test::get_category_photos),
        )
        .route(
            "/photos",
            post(file_test::upload_photo)
                //two full-quality images per request; default 2MB limit is far too small
                .layer(DefaultBodyLimit::max(100 * 1024 * 1024)),
        )
        .route("/album-covers", get(file_test::get_album_covers))
        .route("/resume", get(file_test::get_resume))
        .route("/f2q", get(file_test::get_f2q))
        //KNOWLEDGE/PORTFOLIO API (merged in from the old express backend)
        //the JWT session is a resource: create = login, delete = logout
        .route(
            "/session",
            get(knowledge::auth)
                .post(knowledge::login)
                .delete(knowledge::logout),
        )
        .route(
            "/categories",
            get(knowledge::get_categories).post(knowledge::create_category),
        )
        .route(
            "/categories/{title}",
            put(knowledge::edit_category).delete(knowledge::delete_category),
        )
        .route(
            "/tutorials",
            get(knowledge::search_tutorials)
                .post(knowledge::upload_tutorial)
                //legacy tutorials without a resource_id are deleted by
                //?title=..&source=.. since they have no id to put in the path
                .delete(knowledge::delete_tutorial_legacy),
        )
        .route(
            "/tutorials/{resource_id}",
            put(knowledge::edit_tutorial).delete(knowledge::delete_tutorial),
        )
        .route("/search-index/rebuild", post(knowledge::reindex))
        .nest_service("/photo", serve_images) // Static file route
        .nest_service("/album_covers", serve_album_covers)
        .layer(middleware::from_fn(log_ip_middleware))
        .layer(cors)
        .with_state(state);

    // Bind all interfaces so the reverse proxy can reach this host at 192.168.0.2.
    // One unified backend: media and api routes share a single port.
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Server running on 0.0.0.0:3000");
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
