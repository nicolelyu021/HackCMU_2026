import { describe, expect, it } from 'vitest';
import { mockPlanDraft } from '@pinlog/schema/fixtures';
import {
  createNominatimPlaces,
  createPlaces,
  parseNominatimGeocode,
  parseNominatimPlaces,
} from '../src/index';

describe('mock places', () => {
  const places = createPlaces('mock');
  it('resolves every real stop of the mock plan and drops the invented one', async () => {
    const stops = mockPlanDraft(3).days.flatMap((d) => d.stops);
    const results = await Promise.all(
      stops.map((s) => places.search(s.search_query, { limit: 1 })),
    );
    const unresolved = stops.filter((_, i) => results[i]!.length === 0).map((s) => s.name);
    expect(unresolved).toEqual(['Skyline Sky Lounge']);
    expect((await places.search('primanti brothers'))[0]?.place_id).toBe('osm:node/2710170992');
    expect((await places.search('Cathedral of Learning, Pittsburgh'))[0]?.name).toBe(
      'Cathedral of Learning',
    );
  });
  it('geocodes anything to Pittsburgh with a bbox', async () => {
    const g = await places.geocode('Kyoto');
    expect(g?.bbox).toHaveLength(4);
    expect(g?.lat).toBeCloseTo(40.44, 1);
  });
});

describe('nominatim parsing (no network)', () => {
  const rows = [
    {
      place_id: 1,
      osm_type: 'way',
      osm_id: 30678664,
      lat: '40.4443',
      lon: '-79.95319',
      name: 'Cathedral of Learning',
      display_name:
        'Cathedral of Learning, 4200, Fifth Avenue, Oakland, Pittsburgh, Allegheny County, Pennsylvania, 15260, United States',
      category: 'building',
      type: 'university',
      boundingbox: ['40.4439', '40.4447', '-79.9538', '-79.9526'],
    },
    { place_id: 2, lat: 'x', lon: '1' },
  ];
  it('maps rows to places and converts the bbox order', () => {
    const places = parseNominatimPlaces(rows);
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      place_id: 'osm:way/30678664',
      name: 'Cathedral of Learning',
      lat: 40.4443,
      lng: -79.95319,
      category: 'building',
    });
    expect(places[0]!.address).toBe('4200, Fifth Avenue, Oakland, Pittsburgh');
    const g = parseNominatimGeocode(rows)!;
    expect(g.bbox).toEqual([-79.9538, 40.4439, -79.9526, 40.4447]);
    expect(parseNominatimGeocode([])).toBeNull();
  });
  it('builds bounded queries, sends an identifying User-Agent, caches and rate-limits', async () => {
    const calls: { url: string; ua: string; t: number }[] = [];
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        ua: String((init?.headers as Record<string, string>)['User-Agent']),
        t: Date.now(),
      });
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    const nominatim = createNominatimPlaces({
      email: 'me@andrew.cmu.edu',
      fetch: fakeFetch,
      min_interval_ms: 120,
    });
    const a = await nominatim.search('Cathedral of Learning', {
      bbox: [-80.1, 40.36, -79.86, 40.5],
      limit: 2,
    });
    const b = await nominatim.search('Cathedral of Learning', {
      bbox: [-80.1, 40.36, -79.86, 40.5],
      limit: 2,
    });
    const c = await nominatim.geocode('Pittsburgh, PA');
    expect(a[0]?.place_id).toBe('osm:way/30678664');
    expect(b).toEqual(a);
    expect(c?.display_name).toMatch(/Cathedral/);
    expect(calls).toHaveLength(2); // second search was a cache hit
    expect(calls[0]!.url).toContain('bounded=1');
    expect(calls[0]!.url).toContain('viewbox=-80.1%2C40.5%2C-79.86%2C40.36');
    expect(calls[0]!.ua).toContain('me@andrew.cmu.edu');
    expect(calls[1]!.t - calls[0]!.t).toBeGreaterThanOrEqual(100);
  });
});
