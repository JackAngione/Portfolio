# mediaServer

Unified Rust/Axum backend. Serves the media API (music streaming, artwork,
photos) and the knowledge/portfolio API (tutorials, categories, auth) that
used to live in the old express `backend/`. Talks to MongoDB (data) and
Meilisearch (search).

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
