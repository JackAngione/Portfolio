use crate::AxumState;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use meilisearch_sdk::documents::DocumentsQuery;
use mongodb::bson::{doc, DateTime, Document};
use mongodb::options::IndexOptions;
use mongodb::{Collection, IndexModel};
use rand::{rng, Rng};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio_stream::StreamExt;

//THESE FUNCTIONS ARE THE KNOWLEDGE/PORTFOLIO API (tutorials, categories, auth),
//merged in from the old express backend (backend/src/server.js)

//delete only needs the identifying fields, not the full Tutorial payload
#[derive(Debug, Deserialize)]
pub(crate) struct DeleteTutorialRequest {
    title: String,
    source: String,
    #[serde(default)]
    resource_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Tutorial {
    //never sent back to the client; mongo generates it on insert
    #[serde(rename = "_id", default, skip_serializing)]
    id: Option<mongodb::bson::oid::ObjectId>,
    title: String,
    description: String,
    source: String,
    category: String,
    #[serde(default, rename = "subCategories")]
    sub_categories: Vec<String>,
    #[serde(default)]
    keywords: Keywords,
    #[serde(default)]
    resource_id: String,
}

//old tutorials (from the schemaless express days) stored keywords as one
//space-separated string; newer ones store an array
#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub(crate) enum Keywords {
    Many(Vec<String>),
    One(String),
}

impl Default for Keywords {
    fn default() -> Self {
        Keywords::Many(vec![])
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Category {
    //never sent back to the client; mongo generates it on insert
    #[serde(rename = "_id", default, skip_serializing)]
    id: Option<mongodb::bson::oid::ObjectId>,
    title: String,
    #[serde(default, rename = "subCategories")]
    sub_categories: Vec<String>,
    //sent by the frontend when renaming a category
    #[serde(default, rename = "oldTitle", skip_serializing_if = "Option::is_none")]
    old_title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    username: String,
    exp: u64,
}

#[derive(Debug, Deserialize)]
pub(crate) struct LoginInfo {
    username: String,
    password: String,
}

//auto-delete blacklisted tokens once their expiration Date passes
pub(crate) async fn create_blacklist_ttl_index(database: &mongodb::Database) {
    let blacklist: Collection<Document> = database.collection("BLACKLISTED_TOKENS");
    let index = IndexModel::builder()
        .keys(doc! {"expiration": 1})
        .options(
            IndexOptions::builder()
                .expire_after(Duration::from_secs(0))
                .build(),
        )
        .build();
    if let Err(err) = blacklist.create_index(index).await {
        println!("failed to create blacklist TTL index: {}", err);
    }
}

fn sha256_hash(input: &str) -> String {
    hex::encode(Sha256::digest(input.as_bytes()))
}

fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")?
        .to_str()
        .ok()?
        .split(' ')
        .nth(1)
}

//checks if token is valid and not blacklisted
pub(crate) async fn verify_token(state: &AxumState, headers: &HeaderMap) -> bool {
    let Some(token) = bearer_token(headers) else {
        return false;
    };
    //verifies the token against the secret key
    let key = DecodingKey::from_secret(state.jwt_key.as_bytes());
    if decode::<Claims>(token, &key, &Validation::default()).is_err() {
        return false;
    }
    //check if token is blacklisted
    let blacklist: Collection<Document> = state.mongo_database.collection("BLACKLISTED_TOKENS");
    match blacklist.find_one(doc! {"token": token}).await {
        Ok(blacklisted_token) => blacklisted_token.is_none(),
        Err(_) => false,
    }
}

//check if token is valid
pub(crate) async fn auth(State(state): State<AxumState>, headers: HeaderMap) -> StatusCode {
    if verify_token(&state, &headers).await {
        StatusCode::OK
    } else {
        StatusCode::UNAUTHORIZED
    }
}

//login user
pub(crate) async fn login(
    State(state): State<AxumState>,
    Json(credentials): Json<LoginInfo>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    println!("hit login");
    let users: Collection<Document> = state.mongo_database.collection("users");
    let user = users
        .find_one(doc! {
            "username": &credentials.username,
            "password": sha256_hash(&credentials.password),
        })
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if user.is_none() {
        println!("login failed");
        return Err(StatusCode::UNAUTHORIZED);
    }
    let expiration = SystemTime::now() + Duration::from_secs(24 * 60 * 60);
    let claims = Claims {
        username: credentials.username,
        exp: expiration.duration_since(UNIX_EPOCH).unwrap().as_secs(),
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_key.as_bytes()),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(json!({ "token": token })))
}

//log out user by blacklisting their token until it expires
pub(crate) async fn logout(State(state): State<AxumState>, headers: HeaderMap) -> StatusCode {
    println!("logout request made");
    if !verify_token(&state, &headers).await {
        //token was not valid, so logout anyway
        return StatusCode::UNAUTHORIZED;
    }
    let token = bearer_token(&headers).unwrap();
    //verify_token succeeded, so the token decodes cleanly
    let key = DecodingKey::from_secret(state.jwt_key.as_bytes());
    let decoded = decode::<Claims>(token, &key, &Validation::default()).unwrap();
    // stored as a Date so the TTL index purges the token once it expires
    let expiration = DateTime::from_millis(decoded.claims.exp as i64 * 1000);
    let blacklist: Collection<Document> = state.mongo_database.collection("BLACKLISTED_TOKENS");
    match blacklist
        .insert_one(doc! {"token": token, "expiration": expiration})
        .await
    {
        Ok(_) => {
            println!("logout successful");
            StatusCode::OK
        }
        Err(_) => {
            println!("logout unsuccessful");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

//get a list of all categories
pub(crate) async fn get_categories(
    State(state): State<AxumState>,
) -> Result<Json<Vec<Category>>, StatusCode> {
    println!("category request made");
    let categories: Collection<Category> = state.mongo_database.collection("categories");
    let mut documents = categories
        .find(doc! {})
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut all_categories: Vec<Category> = vec![];
    while let Some(result) = documents
        .try_next()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        all_categories.push(result);
    }
    Ok(Json(all_categories))
}

//INSERT CATEGORY INTO DATABASE
pub(crate) async fn create_category(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(new_category): Json<Category>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        //send unauthorized if user not admin
        return StatusCode::UNAUTHORIZED;
    }
    println!("received upload: {:?}", new_category);
    let categories: Collection<Category> = state.mongo_database.collection("categories");
    match categories.insert_one(new_category).await {
        Ok(_) => StatusCode::OK,
        Err(err) => {
            println!("{}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

//edit category
pub(crate) async fn edit_category(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(category): Json<Category>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        return StatusCode::UNAUTHORIZED;
    }
    let old_title = category.old_title.clone().unwrap_or_default();
    let categories: Collection<Document> = state.mongo_database.collection("categories");
    let update = doc! {
        "title": &category.title,
        "subCategories": &category.sub_categories,
    };
    if categories
        .replace_one(doc! {"title": &old_title}, update)
        .await
        .is_err()
    {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    // Update documents where category is edited
    let tutorials: Collection<Document> = state.mongo_database.collection("tutorials");
    //update subcategories
    let _ = tutorials
        .update_many(
            doc! {"category": &category.title},
            doc! {"$pull": {"subCategories": {"$nin": &category.sub_categories}}},
        )
        .await;
    //change existing category names of tutorials
    let _ = tutorials
        .update_many(
            doc! {"category": &old_title},
            doc! {"$set": {"category": &category.title}},
        )
        .await;
    //the bulk updates above bypass the per-tutorial handlers, so rebuild the
    //search index from mongo to pick up the renamed categories
    if let Err(err) = reindex_meilisearch(&state).await {
        println!("category edit saved but reindex failed: {err}");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::OK
}

//DELETE CATEGORY FROM DATABASE
pub(crate) async fn delete_category(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(category): Json<Category>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        return StatusCode::UNAUTHORIZED;
    }
    println!("received category TO Delete: {:?}", category);
    let categories: Collection<Document> = state.mongo_database.collection("categories");
    let _ = categories.delete_one(doc! {"title": &category.title}).await;
    // Update documents where category is deleted
    let tutorials: Collection<Document> = state.mongo_database.collection("tutorials");
    let _ = tutorials
        .update_many(
            doc! {"category": &category.title},
            doc! {"$set": {"category": ""}},
        )
        .await;
    //the bulk update above bypasses the per-tutorial handlers, so rebuild the
    //search index from mongo to clear the deleted category
    if let Err(err) = reindex_meilisearch(&state).await {
        println!("category delete saved but reindex failed: {err}");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::OK
}

//GENERATE resourceID for a new resource
async fn generate_resource_id(tutorials: &Collection<Tutorial>) -> String {
    const URL_SAFE_CHARS: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    loop {
        let mut resource_id = String::new();
        {
            let mut rng = rng();
            for _ in 0..7 {
                let index = rng.random_range(0..URL_SAFE_CHARS.len());
                resource_id.push(URL_SAFE_CHARS[index] as char);
            }
        }
        let repeat_check = tutorials
            .count_documents(doc! {"resource_id": &resource_id})
            .await
            .unwrap_or(0);
        if repeat_check == 0 {
            return resource_id;
        }
    }
}

//escape regex metacharacters so user input is matched literally; without this
//a query like "c++" errors out and crafted patterns can hang the db (ReDoS)
fn escape_regex(input: &str) -> String {
    let mut escaped = String::with_capacity(input.len());
    for c in input.chars() {
        if c.is_ascii() && !c.is_ascii_alphanumeric() {
            escaped.push('\\');
        }
        escaped.push(c);
    }
    escaped
}

//SEARCHES THE DATABASE BASED ON A USER'S QUERY
pub(crate) async fn search_tutorials(
    State(state): State<AxumState>,
    Query(params): Query<Vec<(String, String)>>,
) -> Result<Json<Vec<Tutorial>>, StatusCode> {
    let search_query = params
        .iter()
        .find(|(key, _)| key == "searchQuery")
        .map(|(_, value)| value.clone())
        .unwrap_or_default();
    let categories: Vec<String> = params
        .iter()
        .filter(|(key, _)| key == "categories" || key == "categories[]")
        .map(|(_, value)| value.clone())
        .collect();
    println!("search request made, query: {}", search_query);

    let regex = doc! {"$regex": escape_regex(&search_query), "$options": "i"};
    let text_match = doc! {"$or": [
        {"title": &regex},
        {"description": &regex},
        {"keywords": &regex},
        {"source": &regex},
    ]};
    //EMPTY SEARCH, JUST RETURN ALL MATCHING DOCUMENTS IN CATEGORIES
    //a search with no query or categories is blocked on the client side
    let filter = if search_query.is_empty() {
        doc! {"category": {"$in": &categories}}
    } else if categories.is_empty() {
        //IF USER DIDNT FILTER BY CATEGORIES
        text_match
    } else {
        //SEARCH FILTERING BY CATEGORY
        doc! {"$and": [{"category": {"$in": &categories}}, text_match]}
    };
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    let mut documents = tutorials
        .find(filter)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mut results: Vec<Tutorial> = vec![];
    while let Some(result) = documents
        .try_next()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        results.push(result);
    }
    Ok(Json(results))
}

//strips the mongo _id so the document can be sent to meilisearch
fn meili_document(tutorial: &Tutorial) -> serde_json::Value {
    let mut value = serde_json::to_value(tutorial).unwrap();
    value.as_object_mut().unwrap().remove("_id");
    value
}

//pushes full documents into meilisearch and waits for the indexing task to
//finish; an Ok from add_or_replace alone only means the task was enqueued,
//meilisearch can still reject the documents while indexing them
async fn meili_add_and_wait(state: &AxumState, documents: &[serde_json::Value]) -> bool {
    let Ok(task) = state
        .search_client
        .index("resources")
        .add_or_replace(documents, Some("resource_id"))
        .await
    else {
        return false;
    };
    match task
        .wait_for_completion(&state.search_client, None, None)
        .await
    {
        Ok(task) => task.is_success(),
        Err(_) => false,
    }
}

//only the primary key is needed when listing what meilisearch has indexed
#[derive(Deserialize)]
struct MeiliDocId {
    #[serde(default)]
    resource_id: String,
}

//rebuilds the search index from mongo, the source of truth: re-uploads every
//tutorial, then removes index entries whose tutorial no longer exists in mongo.
//the dual-writes in the handlers keep the index fresh; this heals any drift
//(failed writes, category renames, meilisearch data loss)
pub(crate) async fn reindex_meilisearch(state: &AxumState) -> Result<(), String> {
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    let mut cursor = tutorials
        .find(doc! {})
        .await
        .map_err(|err| format!("mongo find failed: {err}"))?;
    let mut documents = vec![];
    let mut live_ids = HashSet::new();
    while let Some(tutorial) = cursor
        .try_next()
        .await
        .map_err(|err| format!("mongo cursor failed: {err}"))?
    {
        //meilisearch rejects empty document ids, which would fail the whole batch
        if tutorial.resource_id.is_empty() {
            println!("skipping tutorial with no resource_id: {}", tutorial.title);
            continue;
        }
        live_ids.insert(tutorial.resource_id.clone());
        documents.push(meili_document(&tutorial));
    }
    if !meili_add_and_wait(state, &documents).await {
        return Err("meilisearch rejected the reindex upload".to_string());
    }
    //collect ids that are in meilisearch but no longer in mongo
    let index = state.search_client.index("resources");
    let mut stale_ids: Vec<String> = vec![];
    let mut offset = 0;
    loop {
        let page = DocumentsQuery::new(&index)
            .with_fields(["resource_id"])
            .with_offset(offset)
            .with_limit(1000)
            .execute::<MeiliDocId>()
            .await
            .map_err(|err| format!("failed listing meilisearch documents: {err}"))?;
        let count = page.results.len();
        stale_ids.extend(
            page.results
                .into_iter()
                .map(|document| document.resource_id)
                .filter(|id| !live_ids.contains(id)),
        );
        if count < 1000 {
            break;
        }
        offset += count;
    }
    if !stale_ids.is_empty() {
        println!("reindex removing stale documents: {:?}", stale_ids);
        let task = index
            .delete_documents(&stale_ids)
            .await
            .map_err(|err| format!("failed deleting stale documents: {err}"))?;
        let completed = task
            .wait_for_completion(&state.search_client, None, None)
            .await
            .map_err(|err| format!("stale document deletion did not finish: {err}"))?;
        if !completed.is_success() {
            return Err("stale document deletion failed".to_string());
        }
    }
    Ok(())
}

//rebuild the search index from mongo on demand
pub(crate) async fn reindex(State(state): State<AxumState>, headers: HeaderMap) -> StatusCode {
    if !verify_token(&state, &headers).await {
        return StatusCode::UNAUTHORIZED;
    }
    match reindex_meilisearch(&state).await {
        Ok(()) => {
            println!("reindex complete");
            StatusCode::OK
        }
        Err(err) => {
            println!("reindex failed: {err}");
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

//upload a tutorial
pub(crate) async fn upload_tutorial(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(mut tutorial): Json<Tutorial>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        //send unauthorized if user not admin
        return StatusCode::UNAUTHORIZED;
    }
    println!("received upload: {:?}", tutorial);
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    tutorial.resource_id = generate_resource_id(&tutorials).await;

    let mut upload_error = tutorials.insert_one(&tutorial).await.is_err();

    //ADD TO MEILISEARCH
    if !upload_error {
        upload_error = !meili_add_and_wait(&state, &[meili_document(&tutorial)]).await;
    }
    //error creating new document, revert all changes
    if upload_error {
        let _ = tutorials
            .delete_one(doc! {"resource_id": &tutorial.resource_id})
            .await;
        let _ = state
            .search_client
            .index("resources")
            .delete_document(&tutorial.resource_id)
            .await;
        println!("deleted the unsynced resource");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::OK
}

//edit a tutorial
pub(crate) async fn edit_tutorial(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(tutorial): Json<Tutorial>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        return StatusCode::UNAUTHORIZED;
    }
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    if tutorials
        .replace_one(doc! {"resource_id": &tutorial.resource_id}, &tutorial)
        .await
        .is_err()
    {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    //mongo (the source of truth) was updated; if the index write fails the
    //index drifts until the next reindex heals it
    if !meili_add_and_wait(&state, &[meili_document(&tutorial)]).await {
        println!("edit saved to mongo but not meilisearch; reindex will heal it");
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    StatusCode::CREATED
}

//delete a tutorial
pub(crate) async fn delete_tutorial(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(tutorial): Json<DeleteTutorialRequest>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        //send unauthorized if user not admin
        return StatusCode::UNAUTHORIZED;
    }
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    //resource_id is the canonical key shared by mongo and meilisearch;
    //tutorials from the schemaless express days may predate resource ids
    let filter = if tutorial.resource_id.is_empty() {
        doc! {"title": &tutorial.title, "source": &tutorial.source}
    } else {
        doc! {"resource_id": &tutorial.resource_id}
    };
    if tutorials.delete_one(filter).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }
    if !tutorial.resource_id.is_empty() {
        //mongo (the source of truth) was updated; if the index write fails the
        //index drifts until the next reindex heals it
        if state
            .search_client
            .index("resources")
            .delete_document(&tutorial.resource_id)
            .await
            .is_err()
        {
            println!("deleted from mongo but not meilisearch; reindex will heal it");
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    println!("deleted!");
    StatusCode::OK
}
