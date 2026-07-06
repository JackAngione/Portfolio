const isDev = import.meta.env.MODE === "development";
// Use the hostname the page was loaded from (not a hardcoded 0.0.0.0) so
// this also works when accessing the dev server from another device on the LAN.
const devHost = isDev ? window.location.hostname : null;
export const website_address = isDev
  ? `http://${devHost}:5173`
  : "https://jackangione.com";
//one unified axum backend: media and api share a single server/port
export const media_server_address = isDev
  ? `http://${devHost}:3000`
  : "https://jackangione.com/media";
export const backend_address = isDev
  ? `http://${devHost}:3000`
  : "https://jackangione.com/api";
export const search_server = isDev
  ? `http://${devHost}:7700/`
  : "https://jackangione.com/search/";
