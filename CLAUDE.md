The frontend is a React website that uses the Vite Plus unified toolchain

- Package management is done with pnpm.
- The project is build for production with ```vp build```
- Run the dev server with ```vp dev```
  When you are done, close any background vp dev instances of the server that you ran

The backend is a Rust Axum server.

The project is deployed using Docker. The prod environment is a TrueNas Scale server