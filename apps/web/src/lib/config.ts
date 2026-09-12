// Runtime configuration for the web app. Defaults match .env.example so mock mode needs no env file.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty';
export const FILES_BASE_URL = `${API_URL}/files`;

/** `?fixture=1` — read-only browser mode with the frozen fixtures, no API at all (docs/TEAM.md "Working alone"). */
export function isFixtureMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('fixture') === '1';
}
