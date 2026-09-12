// Runtime configuration for the web app. Defaults match .env.example so mock mode needs no env file.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty';
export const FILES_BASE_URL = `${API_URL}/files`;
