# backend

Unified Rust/Axum backend. Serves the media API (music streaming, artwork,
photos) and the knowledge/portfolio API (tutorials, categories, auth) that
used to live in the old express `backend/`. Talks to MongoDB (data) and
Meilisearch (search).

## Source layout

- `main.rs`: application state, startup, and route registration.
- `music.rs`: song/artist models and MongoDB catalog queries.
- `media.rs`: media routes and photo upload handling.
- `waveform.rs`: audio decoding, cache publication, and shared in-flight work.
- `photo_storage.rs`: durable photo-pair writes, verification, and rollback.
- `photo_resize.rs`: external encoder orchestration and preview generation.
- `knowledge.rs`: authentication, categories, tutorials, and search-index sync.
- `knowledge/search_index.rs`: streamed search-index batching policy.

## Regression checks

```sh
cargo fmt --all -- --check
cargo test --locked
cargo test --locked -- --ignored
python3 tests/local_api_smoke.py
```

The ignored tests require local MongoDB at `127.0.0.1:27017` plus the image
encoders described below. The index test creates and drops its own database.
The API smoke test requires Docker, Cargo, Python 3, and FFmpeg; it starts
disposable MongoDB/Meilisearch containers on loopback ports and the backend in a
temporary media directory, then removes them. It covers authentication, tutorial
writes concurrent with rebuilds, multi-page search batches, empty index setup,
waveforms, range streaming, and photo persistence. It does not use `.env` or the
existing development database/media files.

Search rebuilds upload/delete in batches of 500 and serialize with indexed
mutations within this server process so startup cannot prune a concurrent new
tutorial. The live/stale ID sets still grow with catalog size. Multiple backend
instances would need shared write coordination before providing the same guarantee.

Waveform requests and startup warming share one decode per active song; canceled
requests do not abandon cache generation. Cache JSON is published by a sibling
file rename. A non-unique `songs.artist_id` index is created in the background
on startup (and in fresh development databases). No query sort was added.

## Running against production config

```bash
cargo run
```

Reads env vars from the gitignored `.env`. Required vars:

- `MONGODB_CONNECTION_STRING`
- `JWT_KEY` — signs/verifies login tokens
- `MEILISEARCH_HOST` — defaults to `http://0.0.0.0:7700/` if unset
- `MEILISEARCH_MASTER_KEY` — used to sync tutorial uploads into the
  `resources` index

`BIND_ADDRESS` optionally overrides the HTTP listener, which defaults to
`0.0.0.0:3000`. Isolated tests use a loopback address and an available port.

## Deploying to production

Build and push the image with [`production/deploy_backend.sh`](../production/deploy_backend.sh):

```bash
cd production
GITLAB_USERNAME=... GITLAB_PASSWORD=... PUSH_TO_GITLAB=true sh deploy_backend.sh --version v2.0.2
```

`GITLAB_USERNAME`/`GITLAB_PASSWORD` can also be set in a gitignored
`production/.env` instead of the environment. This builds
`registry.gitlab.com/8jk.ang8/portfolio/backend:v2.0.2` for `linux/amd64`.
The `--version <tag>` argument is required; there is no default tag or
`VERSION_TAG` environment override. If `PUSH_TO_GITLAB=true`, it pushes the image to
the GitLab registry. It stops/removes any existing `Portfolio_Backend`
container but does **not** start a new one.

On the production server (TrueNAS), pull the new image and start the
container manually, injecting env vars at `docker run` time (they are not
baked into the image or read from a file on the server):

```bash
docker pull registry.gitlab.com/8jk.ang8/portfolio/backend:v2.0.2
docker run -d \
  --name Portfolio_Backend \
  -p 3000:3000 \
  -e MONGODB_CONNECTION_STRING=... \
  -e JWT_KEY=... \
  -e MEILISEARCH_HOST=http://0.0.0.0:7700/ \
  -e MEILISEARCH_MASTER_KEY=... \
  registry.gitlab.com/8jk.ang8/portfolio/backend:v2.0.2
```

Meilisearch on the production host is always reachable at `0.0.0.0:7700`.

## Running against a local dev environment

For local development you don't need to touch the production database —
spin up a disposable MongoDB + Meilisearch stack in Docker instead. Requires
[Docker](https://www.docker.com/); nothing else to install.

```bash
./dev.sh
```

`dev.sh` will:

1. Start a local MongoDB (port `27017`) and Meilisearch (port `7700`) via
   [`dev/docker-compose.dev.yml`](../dev/docker-compose.dev.yml).
2. On the **first** start, automatically create the `KNOWLEDGE` database with
   schema validators, unique indexes, and seed data
   (see [`dev/mongo-init/init.js`](../dev/mongo-init/init.js)).
3. Run the server with `APP_ENV=development`, which loads the committed
   `.env.development` (points at the local containers). Your real `.env`
   (production) is not touched and is still used by a plain `cargo run`.

### Dev login

| username | password      |
| -------- | ------------- |
| `admin`  | `devpassword` |

### Other dev commands

| Command                                                    | What it does                               |
| ---------------------------------------------------------- | ------------------------------------------ |
| `docker compose -f ../dev/docker-compose.dev.yml up -d`    | Start just the database containers         |
| `docker compose -f ../dev/docker-compose.dev.yml down`     | Stop the containers (data is kept)         |
| `docker compose -f ../dev/docker-compose.dev.yml down -v && docker compose -f ../dev/docker-compose.dev.yml up -d` | Wipe all data and re-seed a clean database |

The Mongo init scripts only run against an empty data volume, so to get a
fresh database after you've messed things up, use the wipe-and-re-seed
command.

### What's in the seed data

- `users`: the `admin` dev account
- `categories`: `Programming`, `Music Production`
- `tutorials`: 3 sample tutorials across those categories
- `songs` / `artists`: 1 sample each
- Meilisearch: an empty `resources` index (primary key `resource_id`,
  filterable by `category`/`subCategories`) so tutorial uploads sync correctly

### Inspecting the dev database

```bash
docker exec -it knowledge-dev-mongo mongosh KNOWLEDGE
```

## Automatic photo previews

The photo upload form can generate a preview from a JPEG or AVIF original.
`POST /photos` accepts `generateLowRes=true` instead of the `lowRes` file.
The original is kept unchanged; the preview uses the same format with a maximum
1200px long edge (smaller originals are not enlarged). Only JPEG and AVIF are accepted for originals and manual previews; all other
formats are rejected.

Install FFmpeg on the backend host with `zscale` (libzimg), `libaom-av1`, and
PPM support, plus libjpeg-turbo’s `cjpeg` utility (`libjpeg-turbo-utils` on Alpine).
The production Docker image includes both tools. AVIF uses spline36
resizing and lossy AV1 encoding (`lossless=0`, `crf=14`, `cpu-used=0`) after
resizing, retaining input bit depth and HDR color signalling without tone mapping.
JPEG uses Lanczos resizing to lossless RGB pixels, then `cjpeg -quality 75`
for a true 75/100 JPEG quality setting. Only one resize runs at a time, with a
five-minute timeout and temporary-file cleanup; failures do not save a photo pair.
Reverse proxies should allow at least five minutes for the upload response.

Run the real-encoder regression tests (JPEG orientations/sizes, PQ/HLG AVIF
color signalling and bit depth, and invalid input) with:

```bash
cargo test photo_resize -- --ignored
```

### Photo folder layout

Gallery images are listed and served from `server_files/hdrImages/<category>/low/`.
The Full-Res link opens the identical filename in `<category>/high/`. Uploads
save originals to `high/` and generated (or manually supplied) previews to `low/`.
Both copies use the original's sanitized filename stem and detected extension;
manual pairs must use the same image format.

Existing photos must be moved into this layout before they appear in the gallery:
move category-root previews into `low/` and the matching originals from `fullres/`
into `high/`, ensuring filenames and extensions match. Existing server files are
not migrated automatically.

Upload success (`201 Created`) is returned only after both photo copies are
written, synced to storage, and read back to verify their exact bytes. A save or
verification failure returns an error and removes newly created copies; cleanup
failures are logged. Existing filenames are never overwritten, including during
concurrent uploads. The save/verification operation continues if the client
disconnects, so it can finish or clean up the pair.
