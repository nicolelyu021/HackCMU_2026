// Runtime configuration for the web app. Defaults match .env.example so mock mode needs no env file.
//
// Mobile-first (docs/DECISIONS.md H+2): when the page is opened from a phone on the same Wi-Fi as the laptop
// (http://192.168.x.x:3000), the API is assumed to run on that same host, port 8787 — so no NEXT_PUBLIC_API_URL is
// needed for the demo phone. Set it only when the API lives somewhere else.
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? '8787';

function defaultApiUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl();
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/liberty';
export const FILES_BASE_URL = `${API_URL}/files`;

/** `?fixture=1` — read-only browser mode with the frozen fixtures, no API at all (docs/TEAM.md "Working alone"). */
export function isFixtureMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('fixture') === '1';
}
