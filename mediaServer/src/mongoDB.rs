use std::fs::exists;
use std::path::Path;
use crate::AxumState;
use axum::extract::{Path as axum_path, State};
use axum::{Json, debug_handler};
use axum::body::Body;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use mongodb::{bson, bson::doc, Collection};
use mongodb::bson::Bson;
use mongodb::bson::Bson::Document;
use rand::{rng, Rng};
use serde::{Deserialize, Serialize};
use tokio::io::BufReader;
use tokio_stream::StreamExt;
use tokio_util::io::ReaderStream;
use tower::ServiceExt;
use tower_http::services::ServeFile;

enum IDType
{
    Song,
    Artist
}
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Song {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub(crate) id: Option<bson::oid::ObjectId>, // MongoDB ObjectId
    pub(crate) song_id: String,
    pub(crate) song_name: String,
    pub(crate) song_title: String,
    pub(crate) album: String,
    pub(crate) track_list: i32,
    pub(crate) artist_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Artist {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<bson::oid::ObjectId>, // MongoDB ObjectId
    artist_name: String,
    artist_id: String
}
async fn id_generator(database:mongodb::Database, id_type: IDType) -> String{
    let id_length:i32= 5;
    let song_collection = database.collection::<Song>("songs");
    let artist_collection = database.collection::<Artist>("artists");


    let mut rng = rng();
    const URL_SAFE_CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    loop {
        let mut final_id: String = "".to_string();
        for i in 0..id_length
        {
            let index = rng.random_range(0..URL_SAFE_CHARS.len());
            let next = URL_SAFE_CHARS[index] as char;
            final_id.push(next)
        }
        match id_type
        {
            IDType::Song => {
                if song_collection.find_one(doc! {"song_id": &final_id}).await.unwrap().is_some()
                {
                    return final_id;
                }
                continue
            },
            IDType::Artist => {
                if artist_collection.find_one(doc! {"artist_id": &final_id}).await.unwrap().is_some()
                {
                    return final_id;
                }
                continue
            }
        };
    }
    //generate new id
}

//TODO finish create_song
/*pub(crate) async fn create_song(State(state): State<AxumState>, ) {
    let song_id = id_generator(state.mongo_database, IDType::Song).await;
    let new_song = Song {
        "artist": "CHANGE ME",
        "song_name": "CHANGE ME",
        "album": "",
        "track_list": 0,
        "song_id": song_id
    };
    //TODO make sure that new_song is of type "SONG"
    let mut documents = state.song_collection.insert_one(new_song).await;
    print!("songs retrieved!");
}*/
//get one song
pub(crate) async fn get_songs(State(state): State<AxumState>) -> Json<Vec<Song>> {
    let mut documents = state.song_collection.find(doc! {}).await.unwrap();
    print!("songs retrieved!");
    //get all songs in music collection
    let mut all_songs: Vec<Song> = vec![];
    while let Some(result) = documents.try_next().await.unwrap() {
        all_songs.push(result);
    }

    Json(all_songs)
}
//get all songs by one artist
pub(crate) async fn get_artist_songs(
    axum_path(artist_id): axum_path<String>,
    State(state): State<AxumState>,
) -> Json<Vec<Song>> {
    println!("Artist to find: {}", artist_id);
    let filter = doc! { "artist_id": artist_id };
    let mut documents = state.song_collection.find(filter).await.unwrap();

    //get all songs in music collection
    let mut artist_songs: Vec<Song> = vec![];
    while let Some(result) = documents.try_next().await.unwrap() {
        artist_songs.push(result);
    }
    Json(artist_songs)
}

//get list of artists
pub(crate) async fn get_artists(
    State(state): State<AxumState>) -> Json<Vec<Artist>>{
    let artist_collection:Collection<Artist> = state.mongo_database.collection("artists");
    println!("Retrieving artists");
    let mut artist_documents = artist_collection.find(doc! { }).await.unwrap();
    //get all songs in music collection
    let mut artist_list: Vec<Artist> = vec![];
    while let Some(result) = artist_documents.try_next().await.unwrap() {
        artist_list.push(result);
    }
    println!("Artists: {:?}", artist_list);

    Json(artist_list)
}

