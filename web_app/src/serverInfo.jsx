export const website_address = import.meta.env.DEV
  ? "http://0.0.0.0:5173"
  : "https://jackangione.com";
//one unified axum backend: media and api share a single server/port
export const media_server_address = import.meta.env.DEV
  ? "http://0.0.0.0:3000"
  : "https://jackangione.com/media";
export const backend_address = import.meta.env.DEV
  ? "http://0.0.0.0:3000"
  : "https://jackangione.com/api";
export const search_server = import.meta.env.DEV
  ? "http://0.0.0.0:7700/"
  : "https://jackangione.com/search/";
