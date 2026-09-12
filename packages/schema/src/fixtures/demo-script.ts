import type { Vlog, VlogScript } from '../index';
import { routeLengthKm } from '../geo';
import { storageKeys } from '../storage-keys';
import { addDays } from '../time';
import { demoMedia } from './demo-media';
import { DEMO_CREATED_AT, DEMO_DEFAULT_START, DEMO_TRIP_ID, demoPins } from './demo-trip';

export const DEMO_VLOG_ID = 'vlog_pgh_demo';

/**
 * Hand-written vlog script (D's fixture; the A/D Player contract). Narration is grounded ONLY in demoEntries —
 * every pin segment cites the entry it came from. ~50 s total. audio_path keys are produced by the seed with the mock TTS.
 */
export function demoScript(start_date: string = DEMO_DEFAULT_START): VlogScript {
  const pins = demoPins(start_date);
  const media = demoMedia(start_date);
  const seg = (i: number) => storageKeys.segmentAudio(DEMO_VLOG_ID, i);
  const km = routeLengthKm(pins);
  return {
    version: 1,
    trip: {
      title: 'Pittsburgh weekend',
      dates: `${start_date} – ${addDays(start_date, 1)}`,
      language: 'en',
    },
    voice: 'warm_female',
    music_mood: 'calm',
    segments: [
      {
        type: 'title',
        text: 'Pittsburgh weekend',
        subtitle: 'two days · four pins',
        duration_s: 4,
      },
      {
        type: 'pin',
        pin_id: 'pin_pgh_d1_cathedral',
        day_index: 1,
        camera: { lng: -79.95319, lat: 40.4443, zoom: 15.5, pitch: 55, bearing: 20 },
        photos: [{ media_id: 'media_pgh_01', kenburns: 'zoom_in' }],
        narration:
          'We started at the Cathedral of Learning. Stood in the courtyard and looked straight up — the tower disappeared into a blue sky.',
        caption: 'Cathedral of Learning · 10:12',
        mood: 'great',
        source_entry_ids: ['entry_pgh_01'],
        audio_path: seg(1),
        duration_s: 10,
      },
      {
        type: 'pin',
        pin_id: 'pin_pgh_d1_phipps',
        day_index: 1,
        camera: { lng: -79.94871, lat: 40.43889, zoom: 16, pitch: 50, bearing: -30 },
        photos: [
          { media_id: 'media_pgh_02', kenburns: 'zoom_out' },
          { media_id: 'media_pgh_03', kenburns: 'zoom_in' },
        ],
        narration:
          'Phipps next. A rain chain of little cups dripping from the glass roof, and outside the conservatory looked like a ship on the lawn.',
        caption: 'Phipps Conservatory · 11:42',
        mood: 'good',
        source_entry_ids: ['entry_pgh_02'],
        audio_path: seg(2),
        duration_s: 10,
      },
      {
        type: 'pin',
        pin_id: 'pin_pgh_d1_warhol',
        day_index: 1,
        camera: { lng: -80.0025, lat: 40.44837, zoom: 15.5, pitch: 55, bearing: 0 },
        photos: [
          { media_id: 'media_pgh_04', kenburns: 'pan_left' },
          { media_id: 'media_pgh_05', kenburns: 'zoom_out' },
        ],
        narration:
          'At the Warhol, pop portraits on every wall, then a black-and-white elephant that stopped us in the doorway.',
        caption: 'The Andy Warhol Museum · 15:20',
        mood: 'great',
        source_entry_ids: ['entry_pgh_03'],
        audio_path: seg(3),
        duration_s: 10,
      },
      {
        type: 'pin',
        pin_id: 'pin_pgh_d2_cmu',
        day_index: 2,
        camera: { lng: -79.943, lat: 40.4428, zoom: 16, pitch: 50, bearing: -15 },
        photos: [
          { media_id: 'media_pgh_06', kenburns: 'zoom_in' },
          { media_id: 'media_pgh_07', kenburns: 'pan_right' },
          { media_id: 'media_pgh_08', kenburns: 'zoom_out' },
        ],
        narration:
          'Day two: Ferris wheel on The Cut, a pirate skeleton pouring drinks, a pink Eras Tour booth. Then twenty-four hours of code.',
        caption: 'CMU Spring Carnival · 12:10',
        mood: 'great',
        source_entry_ids: ['entry_pgh_04'],
        audio_path: seg(4),
        duration_s: 12,
      },
      {
        type: 'outro',
        text: `${km} km · ${pins.length} places · ${media.filter((m) => m.pin_id).length} photos`,
        duration_s: 4,
      },
    ],
  };
}

export function demoVlog(start_date: string = DEMO_DEFAULT_START): Vlog {
  const script = demoScript(start_date);
  return {
    id: DEMO_VLOG_ID,
    trip_id: DEMO_TRIP_ID,
    status: 'done',
    settings: { language: 'en', voice: 'warm_female', music_mood: 'calm', target_length_s: 60 },
    script,
    video_path: null,
    duration_s: script.segments.reduce((s, x) => s + x.duration_s, 0),
    error: null,
    created_at: DEMO_CREATED_AT,
    updated_at: DEMO_CREATED_AT,
  };
}
