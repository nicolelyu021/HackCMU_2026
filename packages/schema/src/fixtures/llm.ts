import type { ItineraryDraft, ReplanDraft } from '../index';

/**
 * Mock planner output. Always Pittsburgh (the mock places provider only knows Pittsburgh), regardless of destination —
 * fine for mock mode, and it exercises the "drop unresolved" path with one place that does not exist.
 */
export function mockPlanDraft(days = 2): ItineraryDraft {
  const all: ItineraryDraft['days'] = [
    {
      day_index: 1,
      theme: 'Oakland museums and the view',
      stops: [
        { name: 'Carnegie Museum of Natural History', search_query: 'Carnegie Museum of Natural History', kind: 'poi', start_time: '10:00', end_time: '12:00', reason: 'Dinosaur hall is the best in the country and it is next to the Cathedral.' },
        { name: 'The Porch at Schenley', search_query: 'The Porch at Schenley', kind: 'food', start_time: '12:15', end_time: '13:15', reason: 'Wood-fired pizza on the plaza, ten minutes from the museum.' },
        { name: 'Cathedral of Learning', search_query: 'Cathedral of Learning', kind: 'poi', start_time: '13:30', end_time: '14:30', reason: 'Free 36th-floor view over Oakland.' },
        { name: 'Skyline Sky Lounge', search_query: 'Skyline Sky Lounge Pittsburgh', kind: 'poi', start_time: '15:00', end_time: '16:00', reason: 'Rooftop bar with a view (this place is invented on purpose: it must be dropped).' },
        { name: 'Mount Washington Overlook', search_query: 'Mount Washington Overlook', kind: 'poi', start_time: '18:00', end_time: '19:30', reason: 'Sunset over the three rivers.' },
      ],
    },
    {
      day_index: 2,
      theme: 'North Shore art',
      stops: [
        { name: "Pamela's Diner", search_query: "Pamela's Diner (Strip District)", kind: 'food', start_time: '09:00', end_time: '10:00', reason: 'Crêpe-style hotcakes; the Strip is at its best on a weekend morning.' },
        { name: 'Heinz History Center', search_query: 'Heinz History Center', kind: 'poi', start_time: '10:15', end_time: '12:00', reason: 'Smithsonian affiliate two blocks from breakfast.' },
        { name: 'Randyland', search_query: 'Randyland', kind: 'poi', start_time: '13:00', end_time: '14:00', reason: 'Free, colourful, ten minutes from the Mattress Factory.' },
        { name: 'Mattress Factory', search_query: 'Mattress Factory', kind: 'poi', start_time: '14:15', end_time: '16:00', reason: 'Room-sized installations; the Kusama rooms are the reason people go.' },
      ],
    },
    {
      day_index: 3,
      theme: 'Parks',
      stops: [
        { name: 'Frick Park', search_query: 'Frick Park', kind: 'poi', start_time: '10:00', end_time: '12:00', reason: 'Biggest park in the city, easy trails.' },
        { name: 'Phipps Conservatory', search_query: 'Phipps Conservatory', kind: 'poi', start_time: '13:00', end_time: '15:00', reason: 'Glasshouse next to Schenley Park.' },
        { name: 'PNC Park', search_query: 'PNC Park', kind: 'poi', start_time: '18:00', end_time: '21:00', reason: 'Best view of any ballpark in the majors.' },
      ],
    },
  ];
  const n = Math.max(1, Math.min(days, all.length));
  return { days: all.slice(0, n) };
}

/** Mock replan for the seeded trip: "make day 2 lighter". Never touches user pins (Primanti, CMU). */
export const mockReplanDraft: ReplanDraft = {
  summary: 'Dropped the evening overlook and shortened breakfast so day 2 stays light around HackCMU.',
  added: [],
  changed: [
    { pin_id: 'pin_pgh_d2_strip', patch: { planned_end: '2026-09-12T10:00:00' }, reason: 'Shorter breakfast' },
  ],
  removed: [{ pin_id: 'pin_pgh_d2_schenley', reason: 'Lighter evening' }],
};

/** Canned text for the mock LLM, by task. */
export const mockAnswers = {
  ask: 'From your plan: you are here between {start} and {end}. From your notes: {note} If you want, ask me what is nearby or what to do next.',
  chat: 'From your journal so far: {summary} Ask me about any pin, or say "summarize my day".',
  summary: 'Today went {pins}. Best moment from your notes: {note}',
  caption: 'A travel photo with a bright sky and a landmark in the middle distance.',
} as const;
