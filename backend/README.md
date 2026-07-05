# backend_bun

Bun-based backend server. Talks to MongoDB (data) and Meilisearch (search).

To install dependencies:

```bash
bun install
```

## Running against production config

```bash
bun run start
```

Reads env vars from `src/.env` and runs `src/server.js`.

## Running against a local dev environment

For local development you don't need to touch the production database —
spin up a disposable MongoDB + Meilisearch stack in Docker instead. Requires
[Docker](https://www.docker.com/); nothing else to install.

```bash
bun run dev
```

`bun run dev` will:

1. Start a local MongoDB (port `27017`) and Meilisearch (port `7700`) via
   [`dev/docker-compose.dev.yml`](../dev/docker-compose.dev.yml).
2. On the **first** start, automatically create the `KNOWLEDGE` database with
   schema validators, unique indexes, and seed data
   (see [`dev/mongo-init/init.js`](../dev/mongo-init/init.js)).
3. Run the backend with `src/.env.development`, which points at the local
   containers. Your real `.env` (production) is not touched and is still
   used by `bun run start`.

### Dev login

| username | password      |
| -------- | ------------- |
| `admin`  | `devpassword` |

### Other dev commands

| Command                | What it does                               |
| ----------------------- | ------------------------------------------ |
| `bun run dev:db`       | Start just the database containers          |
| `bun run dev:db:stop`  | Stop the containers (data is kept)          |
| `bun run dev:db:reset` | Wipe all data and re-seed a clean database  |

The Mongo init scripts only run against an empty data volume, so to get a
fresh database after you've messed things up, use `dev:db:reset`.

### mediaServer (Rust)

The mediaServer reads `MONGODB_CONNECTION_STRING` from its environment or a
`mediaServer/.env` file (gitignored). To run it against the dev database:

```bash
cd ../mediaServer
echo 'MONGODB_CONNECTION_STRING=mongodb://localhost:27017/KNOWLEDGE' > .env
cargo run
```

The dev database is seeded with one artist and one song so `/getSongs` and
`/artists` return data.

### What's in the seed data

- `users`: the `admin` dev account
- `categories`: `Programming`, `Music Production`
- `tutorials`: 3 sample tutorials across those categories
- `songs` / `artists`: 1 sample each (for mediaServer)
- Meilisearch: an empty `resources` index (primary key `resource_id`,
  filterable by `category`/`subCategories`) so tutorial uploads sync correctly

### Inspecting the dev database

```bash
docker exec -it knowledge-dev-mongo mongosh KNOWLEDGE
```

---

This project was created using `bun init` in bun v1.2.13. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
