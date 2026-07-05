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

echo "Meilisearch dev index ready."
