import type { Media } from '../index';
import { storageKeys } from '../storage-keys';
import { addDays, naive } from '../time';
import { DEMO_CREATED_AT, DEMO_DEFAULT_START, DEMO_PIN_SPECS, DEMO_TRIP_ID } from './demo-trip';

/**
 * 8 real demo photos from User_Photos/. The seed stamps GPS + DateTimeOriginal EXIF and copies
 * them into packages/schema/fixtures/photos/<id>.jpg, then into storage.
 * expected_pin_id is what B's auto-assign must produce; the seed inserts it directly.
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
  /** Repo-relative path to the team's real JPEG. Seed stamps EXIF onto this file when present. */
  source?: string;
  /** Pixel size of the real photo; generated fallback cards use orientation defaults. */
  width?: number;
  height?: number;
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
    orientation: 'portrait',
    label: 'Cathedral of Learning · 10:12',
    caption:
      'Looking straight up the Gothic tower from the courtyard, flowers around the fountain.',
    palette: ['#1e3a8a', '#60a5fa'],
    source: 'User_Photos/Cathedral_of_learning.jpg',
    width: 1279,
    height: 1706,
  },
  {
    id: 'media_pgh_02',
    pin_id: 'pin_pgh_d1_phipps',
    expected_pin_id: 'pin_pgh_d1_phipps',
    day: 1,
    clock: '11:42',
    lat: null,
    lng: null,
    jitter: [0.0001, -0.0002],
    orientation: 'portrait',
    label: 'Phipps rain chain · 11:42',
    caption: 'A rain chain of little cups dripping from the glasshouse roof.',
    palette: ['#14532d', '#86efac'],
    source: 'User_Photos/Phipps_1.jpg',
    width: 1279,
    height: 1706,
  },
  {
    id: 'media_pgh_03',
    pin_id: 'pin_pgh_d1_phipps',
    expected_pin_id: 'pin_pgh_d1_phipps',
    day: 1,
    clock: '12:18',
    lat: null,
    lng: null,
    jitter: [-0.00015, 0.0001],
    orientation: 'landscape',
    label: 'Phipps Conservatory · 12:18',
    caption: 'The glass conservatory sitting on the lawn like a ship, clouds behind it.',
    palette: ['#0c4a6e', '#7dd3fc'],
    source: 'User_Photos/Phipps_2.jpg',
    width: 1706,
    height: 1279,
  },
  {
    id: 'media_pgh_04',
    pin_id: 'pin_pgh_d1_warhol',
    expected_pin_id: 'pin_pgh_d1_warhol',
    day: 1,
    clock: '15:20',
    lat: null,
    lng: null,
    jitter: [0.00015, 0.0001],
    orientation: 'landscape',
    label: 'Warhol portraits · 15:20',
    caption: 'A white gallery room with pop portraits in a row and a low bench in the middle.',
    palette: ['#831843', '#f9a8d4'],
    source: 'User_Photos/Warhol_1.jpg',
    width: 1706,
    height: 1279,
  },
  {
    id: 'media_pgh_05',
    pin_id: 'pin_pgh_d1_warhol',
    expected_pin_id: 'pin_pgh_d1_warhol',
    day: 1,
    clock: '16:05',
    lat: null,
    lng: null,
    jitter: [-0.0001, 0.0002],
    orientation: 'landscape',
    label: 'Warhol elephant · 16:05',
    caption: 'A black-and-white patterned elephant sculpture in the gallery doorway.',
    palette: ['#334155', '#cbd5e1'],
    source: 'User_Photos/Warhol_2.jpg',
    width: 1706,
    height: 1279,
  },
  {
    id: 'media_pgh_06',
    pin_id: 'pin_pgh_d2_cmu',
    expected_pin_id: 'pin_pgh_d2_cmu',
    day: 2,
    clock: '12:10',
    lat: null,
    lng: null,
    jitter: [0.0001, 0.0002],
    orientation: 'portrait',
    label: 'Carnival midway · 12:10',
    caption: 'Ferris wheel and rides on The Cut under a grey spring sky.',
    palette: ['#1e3a8a', '#93c5fd'],
    source: 'User_Photos/Carnival_1.jpg',
    width: 1280,
    height: 1707,
  },
  {
    id: 'media_pgh_07',
    pin_id: 'pin_pgh_d2_cmu',
    expected_pin_id: 'pin_pgh_d2_cmu',
    day: 2,
    clock: '13:40',
    lat: null,
    lng: null,
    jitter: [-0.00012, -0.00015],
    orientation: 'portrait',
    label: 'Pirate booth · 13:40',
    caption: 'A pirate skeleton pouring drinks behind a skull-shaped booth.',
    palette: ['#78350f', '#fbbf24'],
    source: 'User_Photos/Carnival_2.jpg',
    width: 1280,
    height: 1707,
  },
  {
    id: 'media_pgh_08',
    pin_id: 'pin_pgh_d2_cmu',
    expected_pin_id: 'pin_pgh_d2_cmu',
    day: 2,
    clock: '15:05',
    lat: null,
    lng: null,
    jitter: [0.00008, -0.0001],
    orientation: 'portrait',
    label: 'Eras Tour booth · 15:05',
    caption: 'A pink Kappa Alpha Theta booth painted as the Eras Tour, guitar on the wall.',
    palette: ['#9d174d', '#f9a8d4'],
    source: 'User_Photos/Carnival_3.jpg',
    width: 1280,
    height: 1707,
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
      width: s.width ?? (landscape ? 1600 : 1200),
      height: s.height ?? (landscape ? 1200 : 1600),
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
