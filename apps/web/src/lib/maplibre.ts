'use client';
import { getWorkerUrl, setWorkerUrl } from 'maplibre-gl';

// maplibre-gl 6 loads its web worker from a URL next to its own chunk; under Next/Turbopack that is a 404 and the
// map silently never renders (no tiles, no `load` event, so fitBounds-on-load never runs either).
// The app serves the worker + shared chunk from src/app/maplibre/[file]/route.ts; call this before creating a map.
// Client-only module: never import it from a server component (it touches window and imports maplibre-gl).
export function ensureMapLibreWorker(): void {
  if (typeof window === 'undefined') return;
  const url = `${window.location.origin}/maplibre/maplibre-gl-worker.mjs`;
  if (getWorkerUrl() !== url) setWorkerUrl(url);
}
