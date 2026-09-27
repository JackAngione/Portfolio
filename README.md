# Portfolio

Personal website with a React/Vite+ frontend and a Rust/Axum media and knowledge API.

## Project layout

- `web_app/`: frontend routes, components, styles, and assets.
- `backend/`: API, media streaming, and photo processing; see the [backend guide](backend/README.md) for setup and source layout.
- `dev/`: local MongoDB and Meilisearch containers and seed data.
- `production/`: container build/deployment scripts and reverse-proxy configuration.

## Frontend development

```sh
cd web_app
vp install
vp dev
```

Use `vp run build` for a production build, `vp check` for formatting/lint checks,
and `vp test` for tests. Changes and verification are recorded in the
[performance audit](docs/performance-audit.md).

`src/main.jsx` imports the global stylesheet once. Component stylesheets that
use Tailwind `@apply` should `@reference` `main.css` to resolve theme variables
and custom utilities without emitting another copy of the framework and global
styles. Plain CSS stylesheets do not need either import.
