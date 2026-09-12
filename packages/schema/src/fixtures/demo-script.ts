import type { Vlog, VlogScript } from '../index';
import { routeLengthKm } from '../geo';
import { storageKeys } from '../storage-keys';
import { addDays } from '../time';
import { demoMedia } from './demo-media';
import { DEMO_CREATED_AT, DEMO_DEFAULT_START, DEMO_TRIP_ID, demoPins } from './demo-trip';

export const DEMO_VLOG_ID = 'vlog_pgh_demo';

/**
 * Hand-written vlog script (D's fixture; the A/D Player contract). Narration is grounded ONLY in demoEntries —
 * every pin segment cites the entry it came from. ~47 s total. audio_path keys are produced by the seed with the mock TTS.
 */
export function demoScript(start_date: string = DEMO_DEFAULT_START): VlogScript {
  const pins = demoPins(start_date);
  const media = demoMedia(start_date);
  const seg = (i: number) => storageKeys.segmentAudio(DEMO_VLOG_ID, i);
  const km = routeLengthKm(pins);
  return {
    version: 1,
    trip: { title: 'Pittsburgh weekend', dates: `${start_date} – ${addDays(start_date, 1)}`, language: 'en' },
    voice: 'warm_female',
    music_mood: 'calm',
    segments: [
      { type: 'title', text: 'Pittsburgh weekend', subtitle: 'two days · nine pins', duration_s: 3 },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_cathedral', day_index: 1,
        camera: { lng: -79.95319, lat: 40.4443, zoom: 15.5, pitch: 55, bearing: 20 },
        photos: [{ media_id: 'media_pgh_01', kenburns: 'zoom_in' }, { media_id: 'media_pgh_02', kenburns: 'pan_left' }],
        narration: 'We started at the Cathedral of Learning and rode the elevator to the 36th floor. Every Nationality Room downstairs felt like a different century.',
        caption: 'Cathedral of Learning · 10:12', mood: 'great', source_entry_ids: ['entry_pgh_01'], audio_path: seg(1), duration_s: 6.5,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_phipps', day_index: 1,
        camera: { lng: -79.94871, lat: 40.43889, zoom: 16, pitch: 50, bearing: -30 },
        photos: [{ media_id: 'media_pgh_03', kenburns: 'zoom_out' }, { media_id: 'media_pgh_04', kenburns: 'zoom_in' }],
        narration: 'Phipps next, with three dollars extra for the fern room. Worth it, even with fogged-up glasses.',
        caption: 'Phipps Conservatory · 11:42', mood: 'good', source_entry_ids: ['entry_pgh_02'], audio_path: seg(2), duration_s: 6,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_primanti', day_index: 1,
        camera: { lng: -79.95689, lat: 40.44177, zoom: 16.5, pitch: 45, bearing: 45 },
        photos: [{ media_id: 'media_pgh_05', kenburns: 'zoom_in' }, { media_id: 'media_pgh_06', kenburns: 'pan_right' }],
        narration: "Lunch was a Primanti's sandwich with the fries stacked inside. Half of it ended up on the tray, no regrets.",
        caption: "Primanti Bros. · 13:27", mood: 'good', source_entry_ids: ['entry_pgh_03'], audio_path: seg(3), duration_s: 5.5,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_warhol', day_index: 1,
        camera: { lng: -80.0025, lat: 40.44837, zoom: 15.5, pitch: 55, bearing: 0 },
        photos: [{ media_id: 'media_pgh_07', kenburns: 'pan_left' }, { media_id: 'media_pgh_08', kenburns: 'zoom_out' }],
        narration: 'At the Warhol we spent twenty minutes in the Silver Clouds room, batting the balloons around.',
        caption: 'The Andy Warhol Museum · 15:20', mood: 'great', source_entry_ids: ['entry_pgh_04'], audio_path: seg(4), duration_s: 5,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_point', day_index: 1,
        camera: { lng: -80.01009, lat: 40.44151, zoom: 15, pitch: 60, bearing: -60 },
        photos: [{ media_id: 'media_pgh_09', kenburns: 'zoom_in' }, { media_id: 'media_pgh_10', kenburns: 'pan_right' }],
        narration: 'Then Point State Park: one bench by the fountain, watching the three rivers meet, zero plans.',
        caption: 'Point State Park · 17:15', mood: 'good', source_entry_ids: ['entry_pgh_05'], audio_path: seg(5), duration_s: 5.5,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d1_incline', day_index: 1,
        camera: { lng: -80.0186, lat: 40.4394, zoom: 14.5, pitch: 65, bearing: 30 },
        photos: [{ media_id: 'media_pgh_11', kenburns: 'zoom_out' }, { media_id: 'media_pgh_12', kenburns: 'zoom_in' }, { media_id: 'media_pgh_13', kenburns: 'pan_left' }],
        narration: 'We ended with the Duquesne Incline creaking the whole way up to Grandview for sunset. Perfect.',
        caption: 'Grandview overlook · 18:50', mood: 'great', source_entry_ids: ['entry_pgh_06'], audio_path: seg(6), duration_s: 6.5,
      },
      {
        type: 'pin', pin_id: 'pin_pgh_d2_strip', day_index: 2,
        camera: { lng: -79.9834, lat: 40.4516, zoom: 16, pitch: 50, bearing: -15 },
        photos: [{ media_id: 'media_pgh_14', kenburns: 'zoom_in' }, { media_id: 'media_pgh_15', kenburns: 'pan_right' }, { media_id: 'media_pgh_16', kenburns: 'zoom_out' }],
        narration: 'Day two began with pastries in the Strip District, then twenty-four hours of code at HackCMU.',
        caption: 'Strip District · 09:20', mood: 'tired', source_entry_ids: ['entry_pgh_07'], audio_path: seg(7), duration_s: 5.5,
      },
      { type: 'outro', text: `${km} km · ${pins.length} places · ${media.filter((m) => m.pin_id).length} photos`, duration_s: 4 },
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
