//! Shared login admission and password verification. MongoDB is the authority
//! across processes; forwarding headers are accepted only from configured peers.
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier, password_hash::SaltString};
use axum::http::{HeaderMap, StatusCode};
use mongodb::{
    Collection, Database, IndexModel,
    bson::{Document, doc},
    options::{IndexOptions, ReturnDocument},
};
use sha2::{Digest, Sha256};
use std::{net::IpAddr, time::Duration};

static PASSWORD_WORK: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(4);

pub(crate) fn trusted_proxies() -> Result<Vec<IpAddr>, std::net::AddrParseError> {
    std::env::var("TRUSTED_PROXY_IPS")
        .unwrap_or_default()
        .split(',')
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim().parse::<IpAddr>().map(canonical_ip))
        .collect()
}

fn canonical_ip(ip: IpAddr) -> IpAddr {
    match ip {
        IpAddr::V6(ip) => ip
            .to_ipv4_mapped()
            .map(IpAddr::V4)
            .unwrap_or(IpAddr::V6(ip)),
        ip => ip,
    }
}

pub(crate) fn client_ip(
    peer: IpAddr,
    headers: &HeaderMap,
    trusted: &[IpAddr],
) -> Result<IpAddr, StatusCode> {
    let peer = canonical_ip(peer);
    if !trusted.contains(&peer) {
        return Ok(peer);
    }
    // nginx overwrites X-Real-IP; never use an appended X-Forwarded-For chain.
    if headers.get_all("x-real-ip").iter().count() != 1 {
        return Err(StatusCode::BAD_REQUEST);
    }
    headers
        .get("x-real-ip")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse().ok())
        .map(canonical_ip)
        .ok_or(StatusCode::BAD_REQUEST)
}

pub(crate) async fn create_indexes(database: &Database) -> mongodb::error::Result<()> {
    database
        .collection::<Document>("LOGIN_ATTEMPTS")
        .create_index(
            IndexModel::builder()
                .keys(doc! {"expires": 1})
                .options(IndexOptions::builder().expire_after(Duration::ZERO).build())
                .build(),
        )
        .await?;
    Ok(())
}

async fn reserve(database: &Database, key: String, limit: i32) -> Result<bool, StatusCode> {
    let attempts: Collection<Document> = database.collection("LOGIN_ATTEMPTS");
    // One atomic update starts a 60-second window or reserves a slot in it.
    // Mongo's clock avoids inter-instance skew; denied requests never extend it.
    // Saturation bounds counters and TTL bounds retention, including unknown users.
    let expired = doc! {"$lte": [{"$ifNull": ["$expires", mongodb::bson::DateTime::from_millis(0)]}, "$$NOW"]};
    let update = vec![doc! {"$set": {
        "count": {"$cond": [expired.clone(), 1, {"$min": [limit + 1, {"$add": ["$count", 1]}]}]},
        "expires": {"$cond": [expired, {"$add": ["$$NOW", 60_000]}, "$expires"]}
    }}];
    // Concurrent first upserts can race on _id; retry against the winning row.
    for _ in 0..2 {
        match attempts
            .find_one_and_update(doc! {"_id": &key}, update.clone())
            .upsert(true)
            .return_document(ReturnDocument::After)
            .await
        {
            Ok(Some(row)) => {
                return Ok(row
                    .get_i32("count")
                    .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?
                    <= limit);
            }
            Err(error) if matches!(*error.kind, mongodb::error::ErrorKind::Command(ref error) if error.code == 11000) =>
            {
                continue;
            }
            _ => return Err(StatusCode::SERVICE_UNAVAILABLE),
        }
    }
    Err(StatusCode::SERVICE_UNAVAILABLE)
}

pub(crate) async fn admit_login(
    database: &Database,
    username: &str,
    client: IpAddr,
) -> Result<(), StatusCode> {
    // Limit source first so a single source cannot create unlimited account rows.
    let source_allowed = reserve(database, format!("client:{}", canonical_ip(client)), 30).await?;
    let account_allowed = if source_allowed {
        reserve(
            database,
            format!(
                "account:{}",
                hex::encode(Sha256::digest(username.as_bytes()))
            ),
            5,
        )
        .await?
    } else {
        false
    };
    if !source_allowed || !account_allowed {
        tracing::warn!(%client, "Login throttled");
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }
    Ok(())
}

fn hash_password(password: &str) -> Result<String, StatusCode> {
    let salt = SaltString::encode_b64(&rand::random::<[u8; 16]>())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    // Argon2id v19: 19 MiB, two passes, one lane; PHC stores cost and random salt.
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn check_password(password: &str, stored: &str) -> bool {
    if stored.len() == 64 && stored.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        let actual = Sha256::digest(password.as_bytes());
        let expected = hex::decode(stored).unwrap();
        // No early byte mismatch exit for the migration-only legacy comparison.
        return actual
            .iter()
            .zip(expected)
            .fold(0u8, |diff, (a, b)| diff | (a ^ b))
            == 0;
    }
    PasswordHash::new(stored).is_ok_and(|hash| {
        hash.algorithm.as_str() == "argon2id"
            && Argon2::default()
                .verify_password(password.as_bytes(), &hash)
                .is_ok()
    })
}

pub(crate) async fn authenticate(
    database: &Database,
    username: &str,
    password: String,
) -> Result<(), StatusCode> {
    let users: Collection<Document> = database.collection("users");
    let user = users
        .find_one(doc! {"username": username})
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let stored = user
        .as_ref()
        .and_then(|user| user.get_str("password").ok())
        .unwrap_or("")
        .to_owned();
    let old = stored.clone();
    let permit = PASSWORD_WORK
        .try_acquire()
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;
    let (valid, replacement) = tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let valid = check_password(&password, &stored);
        // Spend the KDF cost for missing/legacy users too. Modern hashes already
        // paid that cost during verification. Only successful legacy logins save it.
        let replacement = if !stored.starts_with("$argon2id$") {
            Some(hash_password(&password)?)
        } else {
            None
        };
        Ok::<_, StatusCode>((valid, replacement))
    })
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)??;
    if !valid {
        tracing::warn!("Invalid login credentials");
        return Err(StatusCode::UNAUTHORIZED);
    }
    if let Some(replacement) = replacement {
        let result = users
            .update_one(
                doc! {"_id": user.unwrap().get("_id").unwrap(), "password": old},
                doc! {"$set": {"password": replacement}},
            )
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        // A concurrent password change must not issue a token for the old secret.
        if result.matched_count != 1 {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }
    Ok(())
}

pub(crate) fn valid_resource_url(source: &str) -> bool {
    !source.chars().any(char::is_control)
        && url::Url::parse(source)
            .is_ok_and(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn salted_passwords_and_legacy_verification() {
        let first = hash_password("devpassword").unwrap();
        let second = hash_password("devpassword").unwrap();
        assert_ne!(first, second);
        assert!(first.starts_with("$argon2id$v=19$m=19456,t=2,p=1$"));
        assert!(check_password("devpassword", &first));
        assert!(!check_password("wrong", &first));
        let legacy = hex::encode(Sha256::digest(b"devpassword"));
        assert!(check_password("devpassword", &legacy));
        assert!(!check_password("wrong", &legacy));
        assert!(!check_password("password", "invalid hash"));
    }

    #[test]
    fn ignores_untrusted_forwarding_headers_and_normalizes_addresses() {
        let mut headers = HeaderMap::new();
        headers.insert("x-real-ip", "198.51.100.8".parse().unwrap());
        headers.insert("x-forwarded-for", "198.51.100.9".parse().unwrap());
        let peer = "127.0.0.1".parse().unwrap();
        assert_eq!(client_ip(peer, &headers, &[]).unwrap(), peer);
        assert_eq!(
            client_ip(peer, &headers, &[peer]).unwrap(),
            "198.51.100.8".parse::<IpAddr>().unwrap()
        );
        assert_eq!(
            client_ip("::ffff:127.0.0.1".parse().unwrap(), &headers, &[]).unwrap(),
            peer
        );
        assert!(client_ip(peer, &HeaderMap::new(), &[peer]).is_err());
    }

    #[test]
    fn resources_allow_only_absolute_web_urls() {
        for source in [
            "javascript:alert(1)",
            " JaVaScRiPt:alert(1)",
            "java\nscript:alert(1)",
            "data:text/html,test",
            "//example.com",
            "/relative",
            "https://",
            "https://example.com/\npath",
        ] {
            assert!(!valid_resource_url(source), "{source:?}");
        }
        for source in [
            "https://example.com/a?q=one#two",
            "HTTP://example.com",
            " https://example.com ",
            "https://例え.jp",
        ] {
            assert!(valid_resource_url(source), "{source:?}");
        }
    }
}
