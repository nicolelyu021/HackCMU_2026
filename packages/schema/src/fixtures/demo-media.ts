import type { Media } from '../index';
import { storageKeys } from '../storage-keys';
import { addDays, naive } from '../time';
import { DEMO_CREATED_AT, DEMO_DEFAULT_START, DEMO_PIN_SPECS, DEMO_TRIP_ID } from './demo-trip';

/**
 * 18 demo photos. The seed generates a JPEG per spec (label + gradient, with GPS + DateTimeOriginal EXIF stamped)
 * into packages/schema/fixtures/photos/<id>.jpg, then copies it into storage.
 * expected_pin_id is what B's auto-assign must produce (assign.test.ts asserts 16/16); the seed inserts it directly.
 */
export interface DemoPhotoSpec {
  id: string;
  /** Pin the coordinates are jittered from (null = tray cases). */
  pin_id: string | null;
  expected_pin_id: string | null;
  day: number | null;
  clock: string | null;
  /** Explicit coordinates for the tray cases; otherwise pin + jitter. */
  lat: number | null;
  lng: number | null;
  /** Offsets in degrees from the pin (≈ 11 m per 0.0001 lat, ≈ 8.5 m per 0.0001 lng at Pittsburgh). */
  jitter: [number, number];
  orientation: 'landscape' | 'portrait';
  label: string;
  caption: string;
  palette: [string, string];
}

const pin = (id: string) => {
  const p = DEMO_PIN_SPECS.find((s) => s.id === id);
  if (!p) throw new Error(`unknown demo pin ${id}`);
  return p;
};

export const DEMO_PHOTO_SPECS: DemoPhotoSpec[] = [
  {
    id: 'media_pgh_01',
    pin_id: 'pin_pgh_d1_cathedral',
    expected_pin_id: 'pin_pgh_d1_cathedral',
    day: 1,
    clock: '10:12',
    lat: null,
    lng: null,
    jitter: [0.0002, 0.0003],
    orientation: 'landscape',
    label: 'Cathedral of Learning · 10:12',
    caption: 'A tall Gothic stone tower against a blue sky, seen from a lawn.',
    palette: ['#1e3a8a', '#60a5fa'],
  },
  {
    id: 'media_pgh_02',
    pin_id: 'pin_pgh_d1_cathedral',
    expected_pin_id: 'pin_pgh_d1_cathedral',
    day: 1,
    clock: '10:38',
    lat: null,
    lng: null,
    jitter: [-0.00015, 0.0001],
    orientation: 'portrait',
    label: 'Nationality Rooms · 10:38',
    caption: 'A vaulted stone hall with tall arched windows and wooden study tables.',
    palette: ['#78350f', '#fbbf24'],
  },
  {
    id: 'media_pgh_03',
    pin_id: 'pin_pgh_d1_phipps',
    expected_pin_id: 'pin_pgh_d1_phipps',
    day: 1,
    clock: '11:42',
    lat: null,
    lng: null,
    jitter: [0.0001, -0.0002],
    orientation: 'landscape',
    label: 'Phipps Conservatory · 11:42',
    caption: 'A glasshouse dome with palms and orchids under bright skylights.',
    palette: ['#14532d', '#86efac'],
  },
  // 20:30 is outside the Phipps window ±2h → exercises the same-day nearest-pin fallback
  {
    id: 'media_pgh_04',
    pin_id: 'pin_pgh_d1_phipps',
    expected_pin_id: 'pin_pgh_d1_phipps',
    day: 1,
    clock: '20:30',
    lat: null,
    lng: null,
    jitter: [-0.0002, -0.0001],
    orientation: 'portrait',
    label: 'Phipps at night · 20:30',
    caption: 'Ferns under warm greenhouse lights, fogged glass in the foreground.',
    palette: ['#052e16', '#4ade80'],
  },
  {
    id: 'media_pgh_05',
    pin_id: 'pin_pgh_d1_primanti',
    expected_pin_id: 'pin_pgh_d1_primanti',
    day: 1,
    clock: '13:27',
    lat: null,
    lng: null,
    jitter: [0.00005, 0.0002],
    orientation: 'landscape',
    label: "Primanti's · 13:27",
    caption: 'A sandwich stacked with fries and coleslaw on a paper-lined tray.',
    palette: ['#7c2d12', '#fb923c'],
  },
  {
    id: 'media_pgh_06',
    pin_id: 'pin_pgh_d1_primanti',
    expected_pin_id: 'pin_pgh_d1_primanti',
    day: 1,
    clock: '13:41',
    lat: null,
    lng: null,
    jitter: [-0.0001, -0.00015],
    orientation: 'portrait',
    label: 'Forbes Ave · 13:41',
    caption: 'A neon restaurant sign above a busy lunch counter.',
    palette: ['#881337', '#fb7185'],
  },
  {
    id: 'media_pgh_07',
    pin_id: 'pin_pgh_d1_warhol',
    expected_pin_id: 'pin_pgh_d1_warhol',
    day: 1,
    clock: '15:20',
    lat: null,
    lng: null,
    jitter: [0.00015, 0.0001],
    orientation: 'portrait',
    label: 'Silver Clouds · 15:20',
    caption: 'Silver pillow-shaped balloons floating in a white gallery room.',
    palette: ['#334155', '#cbd5e1'],
  },
  {
    id: 'media_pgh_08',
    pin_id: 'pin_pgh_d1_warhol',
    expected_pin_id: 'pin_pgh_d1_warhol',
    day: 1,
    clock: '16:05',
    lat: null,
    lng: null,
    jitter: [-0.0001, 0.0002],
    orientation: 'landscape',
    label: 'Warhol Museum · 16:05',
    caption: 'Colourful pop-art portraits in a row on a gallery wall.',
    palette: ['#831843', '#f9a8d4'],
  },
  {
    id: 'media_pgh_09',
    pin_id: 'pin_pgh_d1_point',
    expected_pin_id: 'pin_pgh_d1_point',
    day: 1,
    clock: '17:15',
    lat: null,
    lng: null,
    jitter: [0.0002, -0.0002],
    orientation: 'landscape',
    label: 'Point State Park · 17:15',
    caption: 'A large fountain spraying water where two rivers meet, bridges behind.',
    palette: ['#0c4a6e', '#7dd3fc'],
  },
  {
    id: 'media_pgh_10',
    pin_id: 'pin_pgh_d1_point',
    expected_pin_id: 'pin_pgh_d1_point',
    day: 1,
    clock: '17:48',
    lat: null,
    lng: null,
    jitter: [-0.00025, 0.0001],
    orientation: 'portrait',
    label: 'Fort Pitt Bridge · 17:48',
    caption: 'A yellow bridge over a river, seen from a riverside path.',
    palette: ['#713f12', '#fde047'],
  },
  {
    id: 'media_pgh_11',
    pin_id: 'pin_pgh_d1_incline',
    expected_pin_id: 'pin_pgh_d1_incline',
    day: 1,
    clock: '18:50',
    lat: null,
    lng: null,
    jitter: [0.0001, 0.0001],
    orientation: 'landscape',
    label: 'Grandview · 18:50',
    caption: 'A city skyline at sunset from a hilltop overlook, rivers below.',
    palette: ['#7c2d12', '#fdba74'],
  },
  {
    id: 'media_pgh_12',
    pin_id: 'pin_pgh_d1_incline',
    expected_pin_id: 'pin_pgh_d1_incline',
    day: 1,
    clock: '19:12',
    lat: null,
    lng: null,
    jitter: [-0.0001, -0.0002],
    orientation: 'portrait',
    label: 'Incline car · 19:12',
    caption: 'A red wooden incline car on a steep track above the city.',
    palette: ['#7f1d1d', '#fca5a5'],
  },
  {
    id: 'media_pgh_13',
    pin_id: 'pin_pgh_d1_incline',
    expected_pin_id: 'pin_pgh_d1_incline',
    day: 1,
    clock: '19:25',
    lat: null,
    lng: null,
    jitter: [0.00015, -0.0001],
    orientation: 'landscape',
    label: 'Blue hour · 19:25',
    caption: 'City lights coming on across the rivers after sunset.',
    palette: ['#1e1b4b', '#818cf8'],
  },
  {
    id: 'media_pgh_14',
    pin_id: 'pin_pgh_d2_strip',
    expected_pin_id: 'pin_pgh_d2_strip',
    day: 2,
    clock: '09:20',
    lat: null,
    lng: null,
    jitter: [0.0001, 0.0003],
    orientation: 'landscape',
    label: 'Strip District · 09:20',
    caption: 'A busy market street with produce stands and striped awnings.',
    palette: ['#365314', '#bef264'],
  },
  {
    id: 'media_pgh_15',
    pin_id: 'pin_pgh_d2_strip',
    expected_pin_id: 'pin_pgh_d2_strip',
    day: 2,
    clock: '09:47',
    lat: null,
    lng: null,
    jitter: [-0.0002, 0.00015],
    orientation: 'portrait',
    label: 'Bakery counter · 09:47',
    caption: 'A bakery counter with rows of pastries and a chalkboard menu.',
    palette: ['#78350f', '#fcd34d'],
  },
  {
    id: 'media_pgh_16',
    pin_id: 'pin_pgh_d2_strip',
    expected_pin_id: 'pin_pgh_d2_strip',
    day: 2,
    clock: '10:02',
    lat: null,
    lng: null,
    jitter: [0.00005, -0.0002],
    orientation: 'landscape',
    label: 'Penn Ave · 10:02',
    caption: 'Coffee cups on a café table by a window onto a busy street.',
    palette: ['#292524', '#d6d3d1'],
  },
  // No GPS at all → unsorted tray
  {
    id: 'media_pgh_17_nogps',
    pin_id: null,
    expected_pin_id: null,
    day: 1,
    clock: '12:05',
    lat: null,
    lng: null,
    jitter: [0, 0],
    orientation: 'landscape',
    label: 'No GPS · 12:05',
    caption: 'A coffee cup on a wooden table next to an open notebook.',
    palette: ['#1c1917', '#a8a29e'],
  },
  // 20 km away (airport) → no pin within 300 m → unsorted tray
  {
    id: 'media_pgh_18_far',
    pin_id: null,
    expected_pin_id: null,
    day: 1,
    clock: '08:10',
    lat: 40.4915,
    lng: -80.2329,
    jitter: [0, 0],
    orientation: 'portrait',
    label: 'Airport · 08:10',
    caption: 'An airport terminal window with a plane on the tarmac.',
    palette: ['#0f172a', '#94a3b8'],
  },
];

export function photoCoords(spec: DemoPhotoSpec): { lat: number; lng: number } | null {
  if (spec.lat != null && spec.lng != null) return { lat: spec.lat, lng: spec.lng };
  if (!spec.pin_id) return null;
  const p = pin(spec.pin_id);
  return { lat: +(p.lat + spec.jitter[0]).toFixed(6), lng: +(p.lng + spec.jitter[1]).toFixed(6) };
}

export function photoTakenAt(
  spec: DemoPhotoSpec,
  start_date: string = DEMO_DEFAULT_START,
): string | null {
  if (spec.day == null || spec.clock == null) return null;
  return naive(addDays(start_date, spec.day - 1), spec.clock);
}

export function demoMedia(start_date: string = DEMO_DEFAULT_START): Media[] {
  return DEMO_PHOTO_SPECS.map((s) => {
    const coords = photoCoords(s);
    const landscape = s.orientation === 'landscape';
    return {
      id: s.id,
      trip_id: DEMO_TRIP_ID,
      pin_id: s.expected_pin_id,
      storage_path: storageKeys.media(DEMO_TRIP_ID, s.id, 'jpg'),
      thumb_path: storageKeys.thumb(DEMO_TRIP_ID, s.id),
      width: landscape ? 1600 : 1200,
      height: landscape ? 1200 : 1600,
      mime: 'image/jpeg',
      taken_at: photoTakenAt(s, start_date),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      exif: { make: 'Pinlog', model: 'Seed Camera', orientation: 1, offset_time: '-04:00' },
      caption: s.caption,
      assign_method: s.expected_pin_id ? 'auto' : 'none',
      created_at: DEMO_CREATED_AT,
    };
  });
}
