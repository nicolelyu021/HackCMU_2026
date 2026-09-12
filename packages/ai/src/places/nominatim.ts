import {
  haversineM,
  type BBox,
  type GeocodeResult,
  type Place,
  type PlacesProvider,
} from '@pinlog/schema';
import { sleep } from '../util';

export interface NominatimOptions {
  /** Contact for the User-Agent, as the usage policy asks (NOMINATIM_EMAIL). */
  email?: string;
  base_url?: string;
  /** Policy: at most 1 request per second. */
  min_interval_ms?: number;
  timeout_ms?: number;
  fetch?: typeof fetch;
}

interface NominatimRow {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  category?: string;
  class?: string;
  type?: string;
  boundingbox?: [string, string, string, string]; // south, north, west, east
}

const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Pure: Nominatim /search rows → Places ('osm:<type>/<id>'). Rows without coordinates or an OSM id are dropped. */
export function parseNominatimPlaces(json: unknown): Place[] {
  if (!Array.isArray(json)) return [];
  const out: Place[] = [];
  for (const r of json as NominatimRow[]) {
    const lat = num(r.lat);
    const lng = num(r.lon);
    if (lat === null || lng === null || !r.osm_type || r.osm_id === undefined) continue;
    const parts = (r.display_name ?? '').split(',').map((s) => s.trim());
    const name = r.name?.trim() || parts[0] || 'Unnamed place';
    const addressParts = parts[0] === name ? parts.slice(1) : parts;
    out.push({
      place_id: `osm:${r.osm_type}/${r.osm_id}`,
      name,
      address: addressParts.length ? addressParts.slice(0, 4).join(', ') : null,
      lat,
      lng,
      category: r.category ?? r.class ?? r.type ?? null,
    });
  }
  return out;
}

/** Pure: first /search row → destination geocode; Nominatim's [south, north, west, east] becomes our [west, south, east, north]. */
export function parseNominatimGeocode(json: unknown): GeocodeResult | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const r = json[0] as NominatimRow;
  const lat = num(r.lat);
  const lng = num(r.lon);
  if (lat === null || lng === null) return null;
  let bbox: BBox | null = null;
  if (r.boundingbox && r.boundingbox.length === 4) {
    const [s, n, w, e] = r.boundingbox.map(Number);
    if ([s, n, w, e].every((x) => Number.isFinite(x))) bbox = [w!, s!, e!, n!];
  }
  return { lat, lng, display_name: r.display_name ?? '', bbox };
}

/**
 * Nominatim (OpenStreetMap) adapter: serial queue at ≤ 1 req/s, identifying User-Agent, in-process cache
 * (docs/DECISIONS.md "Policies we must respect"). Errors propagate; the planner turns them into dropped stops.
 */
export function createNominatimPlaces(opts: NominatimOptions = {}): PlacesProvider {
  const base = (opts.base_url ?? 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
  const interval = opts.min_interval_ms ?? 1100;
  const timeout = opts.timeout_ms ?? 8000;
  const doFetch = opts.fetch ?? fetch;
  const headers = {
    'User-Agent': `pinlog/0.1 (HackCMU travel diary; ${opts.email ?? 'contact not configured'})`,
    Accept: 'application/json',
    'Accept-Language': 'en',
  };
  const cache = new Map<string, Promise<unknown>>();
  let chain: Promise<unknown> = Promise.resolve();
  let last = 0;

  const request = (url: string): Promise<unknown> => {
    const hit = cache.get(url);
    if (hit) return hit;
    const p = chain.then(async () => {
      const wait = last + interval - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await doFetch(url, { headers, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`nominatim ${res.status} for ${url}`);
      return res.json();
    });
    chain = p.catch(() => undefined);
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // do not cache failures
    return p;
  };

  return {
    name: 'nominatim',
    async geocode(query) {
      const u = new URL(`${base}/search`);
      u.searchParams.set('q', query);
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('limit', '1');
      return parseNominatimGeocode(await request(u.toString()));
    },
    async search(query, o = {}) {
      const u = new URL(`${base}/search`);
      u.searchParams.set('q', query);
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('limit', String(o.limit ?? 3));
      if (o.bbox) {
        const [w, s, e, n] = o.bbox;
        u.searchParams.set('viewbox', `${w},${n},${e},${s}`);
        u.searchParams.set('bounded', '1');
      }
      const places = parseNominatimPlaces(await request(u.toString()));
      const near = o.near;
      return near
        ? [...places].sort(
            (a, b) =>
              haversineM(near.lat, near.lng, a.lat, a.lng) -
              haversineM(near.lat, near.lng, b.lat, b.lng),
          )
        : places;
    },
  };
}
