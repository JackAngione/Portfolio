use crate::AxumState;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::{doc, DateTime, Document};
use mongodb::options::IndexOptions;
use mongodb::{Collection, IndexModel};
use rand::{rng, Rng};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio_stream::StreamExt;

//THESE FUNCTIONS ARE THE KNOWLEDGE/PORTFOLIO API (tutorials, categories, auth),
//merged in from the old express backend (backend/src/server.js)

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
async fn verify_token(state: &AxumState, headers: &HeaderMap) -> bool {
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

    let regex = doc! {"$regex": &search_query, "$options": "i"};
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
        upload_error = state
            .search_client
            .index("resources")
            .add_documents(&[meili_document(&tutorial)], Some("resource_id"))
            .await
            .is_err();
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
    let mut edit_error = tutorials
        .replace_one(doc! {"resource_id": &tutorial.resource_id}, &tutorial)
        .await
        .is_err();
    edit_error = edit_error
        || state
            .search_client
            .index("resources")
            .add_or_update(&[meili_document(&tutorial)], Some("resource_id"))
            .await
            .is_err();
    if edit_error {
        StatusCode::INTERNAL_SERVER_ERROR
    } else {
        StatusCode::CREATED
    }
}

//delete a tutorial
pub(crate) async fn delete_tutorial(
    State(state): State<AxumState>,
    headers: HeaderMap,
    Json(tutorial): Json<Tutorial>,
) -> StatusCode {
    if !verify_token(&state, &headers).await {
        //send unauthorized if user not admin
        return StatusCode::UNAUTHORIZED;
    }
    let tutorials: Collection<Tutorial> = state.mongo_database.collection("tutorials");
    let _ = tutorials
        .delete_one(doc! {"title": &tutorial.title, "source": &tutorial.source})
        .await;
    let _ = state
        .search_client
        .index("resources")
        .delete_document(&tutorial.resource_id)
        .await;
    println!("deleted!");
    StatusCode::OK
}
