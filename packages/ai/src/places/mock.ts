import { haversineM, type PlacesProvider } from '@pinlog/schema';
import { PITTSBURGH_BBOX, mockPlaces } from '@pinlog/schema/fixtures';
import { normalizeName, tokens } from '../util';

const inBBox = (lat: number, lng: number, b: readonly number[]) =>
  lng >= b[0]! && lat >= b[1]! && lng <= b[2]! && lat <= b[3]!;

/** Knows Pittsburgh only (docs/ARCHITECTURE.md). geocode() always answers Pittsburgh so the mock planner works offline. */
export function createMockPlaces(): PlacesProvider {
  return {
    name: 'mock',
    async geocode(query) {
      return {
        lat: 40.4406,
        lng: -79.9959,
        display_name: `${query} (mock geocoder: Pittsburgh, PA)`,
        bbox: PITTSBURGH_BBOX,
      };
    },
    async search(query, opts = {}) {
      const nq = normalizeName(query.replace(/,?\s*pittsburgh(,?\s*pa)?$/i, ''));
      const qTokens = tokens(query).filter((t) => t !== 'pittsburgh' && t !== 'pa');
      // score: 2 = substring either way; 1 = at least half of the query tokens match a name token
      // (equal, or one a prefix of the other when both ≥ 4 chars) and the best match is a distinctive word (≥ 5 chars)
      const scored = mockPlaces
        .map((p) => {
          const nn = normalizeName(p.name);
          if (nq && (nn.includes(nq) || nq.includes(nn))) return { p, score: 2 };
          const pt = tokens(p.name);
          const matched = qTokens.filter((t) =>
            pt.some(
              (n) =>
                n === t || (t.length >= 4 && n.length >= 4 && (n.startsWith(t) || t.startsWith(n))),
            ),
          );
          const ok =
            qTokens.length > 0 &&
            matched.length / qTokens.length >= 0.5 &&
            matched.some((t) => t.length >= 5);
          return { p, score: ok ? 1 : 0 };
        })
        .filter((x) => x.score > 0);
      const bounded = opts.bbox
        ? scored.filter((x) => inBBox(x.p.lat, x.p.lng, opts.bbox!))
        : scored;
      const near = opts.near;
      const sorted = [...bounded].sort(
        (a, b) =>
          b.score - a.score ||
          (near
            ? haversineM(near.lat, near.lng, a.p.lat, a.p.lng) -
              haversineM(near.lat, near.lng, b.p.lat, b.p.lng)
            : 0),
      );
      return sorted.slice(0, opts.limit ?? 5).map((x) => x.p);
    },
  };
}
