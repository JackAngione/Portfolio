const isDev = import.meta.env.MODE === "development";
// Development services bind to loopback; use the local hostname of the page.
const devHost = isDev ? window.location.hostname : null;
export const website_address = isDev
  ? `http://${devHost}:5173`
  : "https://jackangione.com";
//one unified axum backend: the media routes (music, artwork, photos) and the
//api routes share a single server/port, reached through the /api proxy prefix
export const backend_address = isDev
  ? `http://${devHost}:3000`
  : "https://jackangione.com/api";
export const search_server = isDev
  ? `http://${devHost}:7700/`
  : "https://jackangione.com/search/";
