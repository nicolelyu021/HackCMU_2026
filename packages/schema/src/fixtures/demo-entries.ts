import type { Entry, Message } from '../index';
import { DEMO_TRIP_ID } from './demo-trip';

const at = (h: number, m = 0, day = 11) =>
  `2026-09-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;

/** First-person notes with one concrete detail each — the ONLY facts the vlog narration may use. */
export const demoEntries: Entry[] = [
  {
    id: 'entry_pgh_01',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_cathedral',
    day_index: 1,
    text: 'Took the elevator to the 36th floor for the view. The Nationality Rooms downstairs feel like a different century behind every door.',
    mood: 'great',
    created_at: at(14, 50),
  },
  {
    id: 'entry_pgh_02',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_phipps',
    day_index: 1,
    text: '$3 extra for the fern room, worth it. Humid enough that my glasses fogged the second we walked in.',
    mood: 'good',
    created_at: at(16, 40),
  },
  {
    id: 'entry_pgh_03',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_primanti',
    day_index: 1,
    text: 'Fries and slaw inside the sandwich, half of it ended up on the tray. No regrets.',
    mood: 'good',
    created_at: at(17, 55),
  },
  {
    id: 'entry_pgh_04',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_warhol',
    day_index: 1,
    text: 'The Silver Clouds room is the best part, we stayed 20 minutes just batting the balloons around.',
    mood: 'great',
    created_at: at(20, 30),
  },
  {
    id: 'entry_pgh_05',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_point',
    day_index: 1,
    text: 'Sat by the fountain and watched the rivers meet. Three rivers, one bench, zero plans.',
    mood: 'good',
    created_at: at(22, 5),
  },
  {
    id: 'entry_pgh_06',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_incline',
    day_index: 1,
    text: 'Sunset from Grandview. The incline car creaks the whole way up and it is perfect.',
    mood: 'great',
    created_at: at(23, 45),
  },
  {
    id: 'entry_pgh_07',
    trip_id: DEMO_TRIP_ID,
    pin_id: null,
    day_index: 2,
    text: 'Day 2 is HackCMU. Pastries from the Strip first, then 24 hours of code.',
    mood: 'tired',
    created_at: at(14, 20, 12),
  },
  {
    id: 'entry_pgh_08',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d2_cmu',
    day_index: 2,
    text: 'Ferris wheel on The Cut, a pirate skeleton pouring drinks, and a pink Eras Tour booth. Then 24 hours of code.',
    mood: 'great',
    created_at: at(16, 10, 12),
  },
];

export const demoMessages: Message[] = [
  {
    id: 'msg_pgh_01',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_cathedral',
    role: 'user',
    content: 'Is the top floor free to visit?',
    tool_calls: null,
    created_at: at(13, 58),
  },
  {
    id: 'msg_pgh_02',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_cathedral',
    role: 'assistant',
    content:
      'Yes. The Cathedral of Learning is open to the public and the upper floors are free; you are planned here 10:00–11:00, which beats the class-change crowds. From your notes: you already rode the elevator to the 36th floor.',
    tool_calls: null,
    created_at: at(13, 58, 11),
  },
  {
    id: 'msg_pgh_03',
    trip_id: DEMO_TRIP_ID,
    pin_id: null,
    role: 'user',
    content: 'What did we do yesterday?',
    tool_calls: null,
    created_at: at(13, 10, 12),
  },
  {
    id: 'msg_pgh_04',
    trip_id: DEMO_TRIP_ID,
    pin_id: null,
    role: 'assistant',
    content:
      "Day 1 went from Oakland to the North Shore: Cathedral of Learning, Phipps (the fern room), Primanti's, the Warhol, Point State Park, and sunset from the Duquesne Incline. From your notes: the incline car creaks the whole way up.",
    tool_calls: null,
    created_at: at(13, 10, 12),
  },
];
