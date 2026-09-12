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
    text: 'Stood in the courtyard and looked straight up. The tower disappeared into a blue sky, flowers everywhere around the fountain.',
    mood: 'great',
    created_at: at(14, 50),
  },
  {
    id: 'entry_pgh_02',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_phipps',
    day_index: 1,
    text: 'A rain chain of little cups dripping from the glass roof. Outside, the conservatory looked like a glass ship on the lawn.',
    mood: 'good',
    created_at: at(16, 40),
  },
  {
    id: 'entry_pgh_03',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_warhol',
    day_index: 1,
    text: 'Pop portraits on every wall, then a black-and-white elephant sculpture that stopped us in the doorway.',
    mood: 'great',
    created_at: at(20, 30),
  },
  {
    id: 'entry_pgh_04',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d2_cmu',
    day_index: 2,
    text: 'Ferris wheel on The Cut, a pirate skeleton pouring drinks, and a pink Eras Tour booth. Then 24 hours of code.',
    mood: 'great',
    created_at: at(16, 10, 12),
  },
  {
    id: 'entry_pgh_05',
    trip_id: DEMO_TRIP_ID,
    pin_id: null,
    day_index: 2,
    text: 'Day 2 is HackCMU. Carnival in the morning, then we disappear into the tent.',
    mood: 'tired',
    created_at: at(18, 20, 12),
  },
];

export const demoMessages: Message[] = [
  {
    id: 'msg_pgh_01',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_cathedral',
    role: 'user',
    content: 'Is the courtyard free to visit?',
    tool_calls: null,
    created_at: at(13, 58),
  },
  {
    id: 'msg_pgh_02',
    trip_id: DEMO_TRIP_ID,
    pin_id: 'pin_pgh_d1_cathedral',
    role: 'assistant',
    content:
      'Yes. The Cathedral of Learning courtyard is open to the public; you are planned here 10:00–11:00. From your notes: you already stood by the fountain and looked straight up the tower.',
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
      'Day 1 was Oakland to the North Shore: Cathedral of Learning, Phipps (the rain chain under the glass), and the Warhol. From your notes: the elephant sculpture stopped you in the doorway.',
    tool_calls: null,
    created_at: at(13, 10, 12),
  },
];
