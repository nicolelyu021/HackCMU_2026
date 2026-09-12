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
      '42-storey Gothic Revival tower with the Nationality Rooms; free to walk in and the 36th floor has the best view of Oakland.',
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
    ai_reason: 'Victorian glasshouse at the edge of Schenley Park; the seasonal show is a 90-minute loop.',
  },
  {
    id: 'pin_pgh_d1_primanti',
    name: 'Primanti Bros. (Oakland)',
    place_id: 'osm:node/2710170992',
    address: '3803 Forbes Ave, Pittsburgh, PA 15213',
    lat: 40.44177,
    lng: -79.95689,
    day: 1,
    start: '13:15',
    end: '14:00',
    kind: 'food',
    source: 'user',
    ai_reason: null,
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
    ai_reason: 'Largest single-artist museum in North America; the Silver Clouds room is the crowd favourite.',
  },
  {
    id: 'pin_pgh_d1_point',
    name: 'Point State Park',
    place_id: 'osm:way/387635995',
    address: '601 Commonwealth Pl, Pittsburgh, PA 15222',
    lat: 40.44151,
    lng: -80.01009,
    day: 1,
    start: '17:00',
    end: '18:00',
    kind: 'poi',
    source: 'ai',
    ai_reason: 'Where the Allegheny and Monongahela meet; the fountain and the three bridges in one frame.',
  },
  {
    id: 'pin_pgh_d1_incline',
    name: 'Duquesne Incline · Grandview overlook',
    place_id: 'osm:way/54834750',
    address: '1220 Grandview Ave, Pittsburgh, PA 15211',
    lat: 40.4394,
    lng: -80.0186,
    day: 1,
    start: '18:30',
    end: '19:30',
    kind: 'poi',
    source: 'ai',
    ai_reason: '1877 cable car up Mount Washington; the skyline at sunset is the classic Pittsburgh photo.',
  },
  {
    id: 'pin_pgh_d2_strip',
    name: 'Strip District (Penn Ave)',
    place_id: 'osm:relation/5127141',
    address: 'Penn Ave & 21st St, Pittsburgh, PA 15222',
    lat: 40.4516,
    lng: -79.9834,
    day: 2,
    start: '09:00',
    end: '10:30',
    kind: 'food',
    source: 'ai',
    ai_reason: 'Saturday-morning market street: bakeries, pierogies and coffee before the day starts.',
  },
  {
    id: 'pin_pgh_d2_cmu',
    name: 'Carnegie Mellon · The Fence',
    place_id: null,
    address: '5000 Forbes Ave, Pittsburgh, PA 15213',
    lat: 40.4428,
    lng: -79.943,
    day: 2,
    start: '11:00',
    end: '18:00',
    kind: 'custom',
    source: 'user',
    ai_reason: null,
  },
  {
    id: 'pin_pgh_d2_schenley',
    name: 'Schenley Park overlook',
    place_id: 'osm:way/26321001',
    address: 'Schenley Dr, Pittsburgh, PA 15213',
    lat: 40.4374,
    lng: -79.9433,
    day: 2,
    start: '18:30',
    end: '19:30',
    kind: 'poi',
    source: 'ai',
    ai_reason: 'Ten minutes from campus; the lawn above Panther Hollow catches the last light.',
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
    cover_media_id: 'media_pgh_11',
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
