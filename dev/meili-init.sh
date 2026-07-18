#!/bin/sh
# Creates the "resources" index in the dev Meilisearch instance.
# Runs inside the meilisearch-init container (see docker-compose.dev.yml).
set -e

HOST="http://meilisearch:7700"
AUTH="Authorization: Bearer dev_master_key"

echo "Waiting for Meilisearch..."
until curl -sf "$HOST/health" > /dev/null; do
  sleep 1
done

# Index may already exist on subsequent runs; that's fine.
curl -s -X POST "$HOST/indexes" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"uid":"resources","primaryKey":"resource_id"}' > /dev/null || true

curl -s -X PUT "$HOST/indexes/resources/settings/filterable-attributes" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '["category","subCategories"]' > /dev/null

# Meilisearch derives a key's value from its uid + the master key (HMAC), so
# pinning the uid makes the resulting search key deterministic across
# container recreations. Must match web_app/src/API_Keys.jsx's dev key.
curl -s -X POST "$HOST/keys" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"uid":"00000000-0000-0000-0000-000000000001","name":"Dev Fixed Search Key","description":"Deterministic search key for local dev","actions":["search"],"indexes":["*"],"expiresAt":null}' > /dev/null || true

echo "Meilisearch dev index ready."
