// Initializes the KNOWLEDGE database for local development.
// Runs automatically (via mongosh) the first time the dev MongoDB container
// starts with an empty data volume. Schema mirrors what backend/src
// expects.

const db = new Mongo().getDB("KNOWLEDGE");

// ---------------------------------------------------------------------------
// Collections + validators
// ---------------------------------------------------------------------------

db.createCollection("categories", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "subCategories"],
      properties: {
        title: { bsonType: "string" },
        subCategories: { bsonType: "array", items: { bsonType: "string" } },
      },
    },
  },
});

db.createCollection("tutorials", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["resource_id", "title", "description", "source", "category"],
      properties: {
        resource_id: { bsonType: "string" },
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        source: { bsonType: "string" },
        category: { bsonType: "string" },
        subCategories: { bsonType: "array", items: { bsonType: "string" } },
        keywords: { bsonType: "array", items: { bsonType: "string" } },
      },
    },
  },
});

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "password"],
      properties: {
        username: { bsonType: "string" },
        // sha256 hex digest — see login() in backend/src/knowledge.rs
        password: { bsonType: "string" },
      },
    },
  },
});

db.createCollection("BLACKLISTED_TOKENS", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["token"],
      properties: {
        token: { bsonType: "string" },
        // Date, not string — the TTL index below purges expired tokens
        expiration: { bsonType: "date" },
      },
    },
  },
});

// Used by backend (Rust) — every field is required for deserialization.
db.createCollection("songs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "song_id",
        "song_name",
        "song_title",
        "album",
        "track_list",
        "artist_id",
      ],
      properties: {
        song_id: { bsonType: "string" },
        song_name: { bsonType: "string" },
        song_title: { bsonType: "string" },
        album: { bsonType: "string" },
        track_list: { bsonType: "int" },
        artist_id: { bsonType: "string" },
      },
    },
  },
});

db.createCollection("artists", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["artist_name", "artist_id"],
      properties: {
        artist_name: { bsonType: "string" },
        artist_id: { bsonType: "string" },
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

db.tutorials.createIndex({ resource_id: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.BLACKLISTED_TOKENS.createIndex({ token: 1 });
db.BLACKLISTED_TOKENS.createIndex(
  { expiration: 1 },
  { expireAfterSeconds: 0 },
);
db.songs.createIndex({ song_id: 1 }, { unique: true });
db.artists.createIndex({ artist_id: 1 }, { unique: true });

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// Dev login: admin / devpassword (sha256 hex, matching login() hashing)
db.users.insertOne({
  username: "admin",
  password: "d0cc333979497e7263f6288c1aacd6f2cdc659e9efad861265095b7db9060e6a",
});

db.categories.insertMany([
  { title: "Programming", subCategories: ["JavaScript", "Rust", "Databases"] },
  { title: "Music Production", subCategories: ["Synthesis", "Mixing"] },
]);

db.tutorials.insertMany([
  {
    resource_id: "DEV0001",
    title: "Getting Started with MongoDB",
    description: "Sample seed tutorial for local development.",
    source: "https://www.mongodb.com/docs/",
    category: "Programming",
    subCategories: ["Databases"],
    keywords: ["mongodb", "database", "nosql"],
  },
  {
    resource_id: "DEV0002",
    title: "The Rust Book",
    description: "Official introduction to the Rust programming language.",
    source: "https://doc.rust-lang.org/book/",
    category: "Programming",
    subCategories: ["Rust"],
    keywords: ["rust", "systems", "programming"],
  },
  {
    resource_id: "DEV0003",
    title: "Intro to Subtractive Synthesis",
    description: "Sample tutorial in a second category.",
    source: "https://example.com/synthesis",
    category: "Music Production",
    subCategories: ["Synthesis"],
    keywords: ["synth", "oscillator", "filter"],
  },
]);

// artist_id/song_id values match real folders/files under
// backend/server_files/artists so audio, artwork, and waveforms actually
// resolve in a local dev run instead of 404ing.
db.artists.insertMany([
  { artist_name: "Dev Artist A", artist_id: "a43hx" },
  { artist_name: "Dev Artist B", artist_id: "xe3Gy" },
]);

db.songs.insertMany([
  {
    song_id: "5T3Eh",
    song_name: "5T3Eh.wav",
    song_title: "Just Dance!!",
    album: "JUST DANCE!!",
    track_list: NumberInt(1),
    artist_id: "a43hx",
  },
  {
    song_id: "5T4Eh",
    song_name: "5T4Eh.wav",
    song_title: "Vanity",
    album: "VANITY",
    track_list: NumberInt(1),
    artist_id: "a43hx",
  },
  {
    song_id: "3K4G9",
    song_name: "3K4G9.aac",
    song_title: "3K4G9",
    album: "",
    track_list: NumberInt(1),
    artist_id: "xe3Gy",
  },
  {
    song_id: "fDgDs",
    song_name: "fDgDs.aac",
    song_title: "Fell In Luv, Dyin Rich",
    album: "FELL IN LUV, DYIN RICH",
    track_list: NumberInt(1),
    artist_id: "xe3Gy",
  },
]);

print("KNOWLEDGE dev database initialized and seeded.");
