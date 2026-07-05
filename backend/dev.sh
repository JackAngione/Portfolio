#!/usr/bin/env bash
# Runs the backend against the local dev database. Starts the shared
# Docker dev stack, then runs a dev build with the committed
# .env.development config.
set -euo pipefail
cd "$(dirname "$0")"

docker compose -f ../dev/docker-compose.dev.yml up -d
APP_ENV=development cargo run
