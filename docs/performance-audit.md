# Frontend and backend performance audit

Date: 2026-09-26. Scope: React/Vite+ frontend, Rust/Axum backend, build output,
and supporting project structure. Focused Sol 6 high-effort reviews covered both
sides, followed by an independent review of the resulting changes. This was a
source/build audit with local checks, not a production load benchmark.

## Implemented

### Generate global CSS once

Route and component stylesheets imported Tailwind and `main.css` repeatedly.
Each lazy route therefore emitted another copy of framework, theme, and global
styles. `main.jsx` already imports the global stylesheet for every route.

Stylesheets with `@apply` now use `@reference` to resolve the same theme and
utilities. Plain CSS files no longer import the framework. Theme settings and
animation behavior are unchanged. Public font URLs now use `/fonts/` directly,
removing development warnings and duplicate hashed font copies in the build.

| Build measurement | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| All emitted CSS assets | 524,147 bytes | 92,739 bytes | 82.3% |
| Entry CSS asset | 91,769 bytes | 80,286 bytes | 12.5% |
| Resources route CSS | 85,670 bytes | 8,559 bytes | 90.0% |
| Sum of individually gzipped CSS assets | 85,001 bytes | 16,244 bytes | 80.9% |

The first row sums all lazy-route assets; it is not the initial-page download
size. Gzip sizes are local compression measurements, not observed network traffic.

During the CSS-only step, an emitted-CSS review found the same 644 unique rules,
69 identical custom
property registrations, and seven font-face rules. Five theme variables used
only by route `@apply` rules now resolve through equivalent generated fallbacks;
the light-theme override remains present. Browser comparisons of 14 style
properties on 74 elements across resources and coding-project pages matched.
The site currently disables theme switching, so light mode was checked in the
emitted CSS rather than through the UI.

### Bound photo verification memory

[`photo_storage.rs`](../backend/src/photo_storage.rs) previously read each saved
image into a new full-size buffer while both uploaded image buffers were still
resident. Verification now reads and compares 64 KiB chunks and checks for extra
bytes after the expected content. Temporary verification memory is independent
of image size. Upload buffering itself is unchanged.

Exclusive file creation, syncing, exact byte comparison, rollback on failure,
and the detached blocking save operation remain intact. Tests cover successful
saves, second-file failure, existing-file protection, cross-chunk mismatch,
truncation, and trailing data.

### Keep filesystem probes off async workers

[`media.rs`](../backend/src/media.rs) now awaits `tokio::fs::try_exists` when
looking for artwork/audio extensions, instead of performing synchronous probes
on an async request worker. Probes remain sequential to preserve extension
priority. Missing paths and probe errors retain their previous behavior. This
improves scheduling on slow storage; request-latency gains were not benchmarked.

### Clarify backend module names

Renamed `file_test.rs` to `media.rs` and `mongoDB.rs` to `music.rs`, matching their
runtime responsibilities. Route paths and handler mappings are unchanged. The
[backend guide](../backend/README.md) now documents the module boundaries. Larger
feature splits can be staged after API integration coverage exists.

### Stabilize resource dialogs and result identities

`ResourcesPage` now uses module-level hit and modal components, so edit/delete
state changes no longer remount search hits or reset the search field. The
Meilisearch adapter explicitly uses `resource_id` for result identity. Category
options load only when the editor is first opened and remain cached while the
page is mounted. Closing during a request cancels it; failed loads can retry on
reopen. Anonymous browsing no longer fetches options for a hidden editor.

Each opening mounts a fresh form/confirmation. Cancelled drafts, keyword and
subcategory selections, and delete confirmations cannot leak to another item.
Category options derive from the response rather than duplicated effect state.
Successful edits refresh search results; unsuccessful edits/deletes retain the
existing error handling without refreshing. Tests use real React Select controls
and cover category changes, empty data, success/failure, cancel/reopen, search
state preservation, and mounted hit identity.

### Share waveform decoding and publish cache files atomically

`waveform.rs` now owns waveform generation and its active-task registry. Requests
and startup warming share a single decode for the same song, while unrelated
songs can run independently. The worker owns the operation, so client cancellation
does not abandon it. Finished entries are removed before notifying waiters, so
failed work can be retried immediately and the registry does not retain old songs.

Cache JSON is written to a unique sibling file and then renamed into place.
Readers cannot observe partial JSON. Existing peak computation and durations
are unchanged, as are request extension priority and case-insensitive startup
warming. Tests cover concurrency, independent songs, cancellation, corrupt-cache
recovery, retry, cache hits, startup overlap, and extension casing. The real API
check also sends twelve concurrent requests against an actual WAV file.

### Batch search synchronization and protect concurrent writes

Full documents now stream from MongoDB in batches of 500; upload tasks must
succeed before proceeding. All indexed IDs are listed before stale deletions,
which also use batches of 500. Listing failure therefore cannot start pruning,
and deletions cannot shift the offsets of an unfinished scan. Live/stale ID sets
still grow with the catalog, but the full document buffer is bounded by a batch.
Empty catalogs preserve the empty upload needed to initialize a missing index.

A real API regression test exposed a pre-existing race: a startup rebuild could
remove a newly uploaded tutorial as stale. Indexed tutorial/category mutations
now share a lock with rebuilds, from the Mongo mutation through search sync.
Category handlers use a helper that requires the held guard to avoid recursively
acquiring the lock. Ordinary reads remain concurrent. This coordination applies
within one backend process; multi-instance deployments need shared coordination.

Unit tests cover multiple batches, legacy empty IDs, empty catalogs, pagination,
and source/upload/list/delete errors. The real API test covers simultaneous
writes/rebuilds, 1,003 live batch fixtures, 1,007 stale search fixtures, pruning an
empty catalog, and initializing an absent index.

### Index artist lookups and avoid redundant grid renders

The local artist-song query used a collection scan. A non-unique `artist_id`
index is now included in development seeds and ensured in a background startup
task for existing catalogs. Index failure logs a warning without preventing HTTP
startup. Query payloads and sorting code are unchanged. The Mongo integration
test verifies identical ordered results for an interleaved 2,000-song fixture,
repeated index creation, missing artists, and only 20 examined documents/keys
for the 20 matching songs. No new ordering guarantee is imposed on this
previously unsorted query.

The album-art grid now stores rounded tile counts and skips state changes when
a resize leaves those counts unchanged. A React Profiler test verifies no extra
commit within a threshold and the same grid dimensions after resize/rotation.

## Decisions that preserve intended behavior

- `FilmGrain.jsx` still renders at display cadence. Its `fps` parameter controls
  individual grain rerolls, not rendering FPS. Throttling it would change the
  intended animation; no measured defect justifies that visual change.
- Broad frontend directory moves were not needed to fix the identified issues.
  The backend waveform and search-batching responsibilities were extracted along
  with their tests; further directory churn would not provide a demonstrated
  runtime benefit.

## Verification

- `vp install`: completed; only three development test dependencies were added
  (`@testing-library/react`, `@testing-library/user-event`, `jsdom`). Production
  dependency versions are unchanged.
- `vp check`: passes after formatting the existing outliers; 34 warnings remain
  in older code. There are no check errors.
- `vp test`: six React interaction/performance tests pass across three files.
- `vp run build`: passes; all six referenced public font files are present.
- `cargo fmt --all -- --check`: passes.
- `cargo test --locked`: 18 pass, with two environment-dependent tests ignored
  by default. The remaining compiler warnings are two deserialized Mongo ID fields.
- `cargo test --locked -- --ignored`: both pass (real JPEG/PQ/HLG AVIF encoder
  regression and isolated Mongo index/result-order test).
- Final combined run, `cargo test --locked -- --include-ignored`: all 20 pass.
- `python3 backend/tests/local_api_smoke.py`: passes against disposable local
  MongoDB and Meilisearch containers, covering authentication/logout, catalog
  reads, tutorial CRUD, concurrent writes/rebuilds, batch synchronization, empty
  index initialization, waveform/cache requests, range streaming, exact photo
  persistence, unauthorized uploads, and duplicate-file conflicts.
- Browser checks verified real Meilisearch results render after the adapter
  identity fix. The earlier CSS step also compared 14 computed properties on 74
  elements and checked the 390 px resources layout. These are targeted checks,
  not a claim of exhaustive visual coverage.
- Temporary test containers and files are removed by the API smoke runner. No
  production services or existing development data were modified by the audit
  and its regression tests.
