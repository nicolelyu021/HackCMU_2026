import type { Pin, PinKind, PinSource, Trip } from '../index';
import { addDays, naive } from '../time';

// Seeded demo trip: "Pittsburgh weekend". Day 1 = the day before the demo, day 2 = demo day (HackCMU).
// Ids are FROZEN — the hand-written vlog script and the mock replan reference them.
export const DEMO_TRIP_ID = 'trip_pgh';
export const DEMO_DEFAULT_START = '2026-09-11';
export const DEMO_TIMEZONE = 'America/New_York';
export const DEMO_CREATED_AT = '2026-09-10T20:00:00.000Z';

interface PinSpec {
  id: string;
  name: string;
  place_id: string | null;
  address: string | null;
  lat: number;
  lng: number;
  day: number;
  start: string;
  end: string;
  kind: PinKind;
  source: PinSource;
  ai_reason: string | null;
}

// Coordinates verified against Nominatim (2026-09-11); place_ids are the real OSM ids where known.
// Stops match the team's real photos (Cathedral, Phipps, Warhol, CMU Carnival).
export const DEMO_PIN_SPECS: PinSpec[] = [
  {
    id: 'pin_pgh_d1_cathedral',
    name: 'Cathedral of Learning',
    place_id: 'osm:way/30678664',
    address: '4200 Fifth Ave, Pittsburgh, PA 15260',
    lat: 40.4443,
    lng: -79.95319,
    day: 1,
    start: '10:00',
    end: '11:00',
    kind: 'poi',
    source: 'ai',
    ai_reason:
      '42-storey Gothic Revival tower with the Nationality Rooms; free to walk in and the courtyard fountain is the classic photo.',
  },
  {
    id: 'pin_pgh_d1_phipps',
    name: 'Phipps Conservatory',
    place_id: 'osm:relation/2785563',
    address: '1 Schenley Dr, Pittsburgh, PA 15213',
    lat: 40.43889,
    lng: -79.94871,
    day: 1,
    start: '11:30',
    end: '13:00',
    kind: 'poi',
    source: 'ai',
    ai_reason:
      'Victorian glasshouse at the edge of Schenley Park; the rain chain under the glass roof is a quiet favourite.',
  },
  {
    id: 'pin_pgh_d1_warhol',
    name: 'The Andy Warhol Museum',
    place_id: 'osm:way/1478475435',
    address: '117 Sandusky St, Pittsburgh, PA 15212',
    lat: 40.44837,
    lng: -80.0025,
    day: 1,
    start: '15:00',
    end: '16:30',
    kind: 'poi',
    source: 'ai',
    ai_reason:
      'Largest single-artist museum in North America; pop portraits on every wall and a black-and-white elephant in the doorway.',
  },
  {
    id: 'pin_pgh_d2_cmu',
    name: 'CMU Spring Carnival',
    place_id: null,
    address: 'The Cut, Carnegie Mellon University, Pittsburgh, PA 15213',
    lat: 40.4428,
    lng: -79.943,
    day: 2,
    start: '11:00',
    end: '18:00',
    kind: 'custom',
    source: 'user',
    ai_reason: null,
  },
];

export function demoTrip(start_date: string = DEMO_DEFAULT_START): Trip {
  return {
    id: DEMO_TRIP_ID,
    title: 'Pittsburgh weekend',
    destination: 'Pittsburgh, PA',
    start_date,
    end_date: addDays(start_date, 1),
    party: { size: 2, kind: 'friends' },
    interests: ['food', 'views', 'museums'],
    pace: 'moderate',
    budget: 'mid',
    language: 'en',
    status: 'active',
    visibility: 'private',
    share_slug: null,
    cover_media_id: 'media_pgh_01',
    center_lat: 40.4433,
    center_lng: -79.9436,
    created_at: DEMO_CREATED_AT,
  };
}

export function demoPins(start_date: string = DEMO_DEFAULT_START): Pin[] {
  const perDay = new Map<number, number>();
  return DEMO_PIN_SPECS.map((s) => {
    const order_index = perDay.get(s.day) ?? 0;
    perDay.set(s.day, order_index + 1);
    const date = addDays(start_date, s.day - 1);
    return {
      id: s.id,
      trip_id: DEMO_TRIP_ID,
      name: s.name,
      place_id: s.place_id,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      day_index: s.day,
      order_index,
      planned_start: naive(date, s.start),
      planned_end: naive(date, s.end),
      kind: s.kind,
      source: s.source,
      ai_reason: s.ai_reason,
      created_at: DEMO_CREATED_AT,
    };
  });
}
