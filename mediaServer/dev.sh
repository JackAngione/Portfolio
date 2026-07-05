#!/usr/bin/env bash
# Runs the mediaServer against the local dev database (mirrors `bun run dev`
# in backend/). Starts the shared Docker dev stack, then runs a dev build
# with the committed .env.development config.
set -euo pipefail
cd "$(dirname "$0")"

docker compose -f ../dev/docker-compose.dev.yml up -d
APP_ENV=development cargo run
