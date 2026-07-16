use crate::AxumState;
use axum::extract::{Path as axum_path, State};
use axum::http::StatusCode;
use axum::Json;
use mongodb::{bson, bson::doc, Collection};
use rand::{rng, Rng};
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;

enum IDType {
    Song,
    Artist,
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
    artist_id: String,
}
async fn id_generator(database: mongodb::Database, id_type: IDType) -> String {
    let id_length: i32 = 5;
    let song_collection = database.collection::<Song>("songs");
    let artist_collection = database.collection::<Artist>("artists");

    const URL_SAFE_CHARS: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    loop {
        let mut final_id: String = "".to_string();
        //scoped so the non-Send rng is dropped before the awaits below
        {
            let mut rng = rng();
            for _ in 0..id_length {
                let index = rng.random_range(0..URL_SAFE_CHARS.len());
                final_id.push(URL_SAFE_CHARS[index] as char);
            }
        }
        //only use the generated id if no document already has it
        let taken = match id_type {
            IDType::Song => song_collection
                .find_one(doc! {"song_id": &final_id})
                .await
                .map(|existing| existing.is_some()),
            IDType::Artist => artist_collection
                .find_one(doc! {"artist_id": &final_id})
                .await
                .map(|existing| existing.is_some()),
        };
        //on a database error, keep retrying rather than returning an unverified id
        if let Ok(false) = taken {
            return final_id;
        }
    }
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
//collects every document matching the filter, mapping db errors to a 500
//instead of panicking (a panic here would kill the request task)
async fn collect_all<T: serde::de::DeserializeOwned + Send + Sync>(
    collection: &Collection<T>,
    filter: bson::Document,
) -> Result<Vec<T>, StatusCode> {
    let mut documents = collection
        .find(filter)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut results: Vec<T> = vec![];
    while let Some(result) = documents
        .try_next()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        results.push(result);
    }
    Ok(results)
}

//get one song
pub(crate) async fn get_songs(
    State(state): State<AxumState>,
) -> Result<Json<Vec<Song>>, StatusCode> {
    let all_songs = collect_all(&state.song_collection, doc! {}).await?;
    println!("songs retrieved!");
    Ok(Json(all_songs))
}
//get all songs by one artist
pub(crate) async fn get_artist_songs(
    axum_path(artist_id): axum_path<String>,
    State(state): State<AxumState>,
) -> Result<Json<Vec<Song>>, StatusCode> {
    println!("Artist to find: {}", artist_id);
    let filter = doc! { "artist_id": artist_id };
    let artist_songs = collect_all(&state.song_collection, filter).await?;
    Ok(Json(artist_songs))
}

//get list of artists
pub(crate) async fn get_artists(
    State(state): State<AxumState>,
) -> Result<Json<Vec<Artist>>, StatusCode> {
    let artist_collection: Collection<Artist> = state.mongo_database.collection("artists");
    println!("Retrieving artists");
    let artist_list = collect_all(&artist_collection, doc! {}).await?;
    Ok(Json(artist_list))
}
