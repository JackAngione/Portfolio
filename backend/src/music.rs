//! Music catalog models and MongoDB queries for songs and artists.
use crate::AxumState;
use axum::Json;
use axum::extract::{Path as axum_path, State};
use axum::http::StatusCode;
use mongodb::{Collection, IndexModel, bson, bson::doc};
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;

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
// Non-unique: existing catalog contents and API ordering are not rewritten.
pub(crate) async fn create_indexes(database: &mongodb::Database) -> mongodb::error::Result<()> {
    database
        .collection::<Song>("songs")
        .create_index(IndexModel::builder().keys(doc! { "artist_id": 1 }).build())
        .await?;
    Ok(())
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires a local MongoDB on 127.0.0.1:27017"]
    async fn artist_index_preserves_results_and_avoids_catalog_scan() {
        // A separate database keeps the developer's catalog untouched. This
        // test deliberately never reads production connection settings.
        let client = mongodb::Client::with_uri_str(
            "mongodb://127.0.0.1:27017/?serverSelectionTimeoutMS=3000",
        )
        .await
        .unwrap();
        let database = client.database(&format!(
            "knowledge_index_test_{:032x}",
            rand::random::<u128>()
        ));
        let test_database = database.clone();
        let result = tokio::spawn(async move {
            let songs = test_database.collection::<Song>("songs");
            let fixtures: Vec<Song> = (0..2000)
                .map(|i| Song {
                    id: None,
                    song_id: format!("song-{i}"),
                    song_name: format!("name-{i}"),
                    song_title: format!("title-{i}"),
                    album: String::new(),
                    track_list: i % 7,
                    artist_id: if i % 100 == 0 { "selected" } else { "other" }.into(),
                })
                .collect();
            songs.insert_many(fixtures).await.unwrap();
            let filter = doc! { "artist_id": "selected" };
            let before = collect_all(&songs, filter.clone()).await.unwrap();

            create_indexes(&test_database).await.unwrap();
            create_indexes(&test_database).await.unwrap(); // repeated startup
            let after = collect_all(&songs, filter.clone()).await.unwrap();
            assert_eq!(
                serde_json::to_value(&before).unwrap(),
                serde_json::to_value(&after).unwrap(),
                "index creation must not reshape or reorder this interleaved catalog",
            );
            assert_eq!(after.len(), 20);
            assert!(
                collect_all(&songs, doc! { "artist_id": "missing" })
                    .await
                    .unwrap()
                    .is_empty()
            );

            let explain = test_database
                .run_command(doc! {
                    "explain": { "find": "songs", "filter": filter },
                    "verbosity": "executionStats",
                })
                .await
                .unwrap();
            let stats = explain.get_document("executionStats").unwrap();
            assert_eq!(stats.get_i32("nReturned").unwrap(), 20);
            assert_eq!(stats.get_i32("totalDocsExamined").unwrap(), 20);
            assert_eq!(stats.get_i32("totalKeysExamined").unwrap(), 20);
        })
        .await;
        database.drop().await.unwrap(); // also runs if an assertion panics
        result.unwrap();
    }
}
