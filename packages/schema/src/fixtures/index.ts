import type { TripBundle } from '../api';
import type { RepoRows } from '../ports/repo';
export * from './demo-trip';
export * from './demo-media';
export * from './demo-entries';
export * from './demo-script';
export * from './places';
export * from './llm';

import { demoEntries, demoMessages } from './demo-entries';
import { DEMO_PHOTO_SPECS, demoMedia } from './demo-media';
import { demoScript, demoVlog } from './demo-script';
import { DEMO_DEFAULT_START, demoPins, demoTrip } from './demo-trip';

/** The seeded trip as the map page receives it. */
export function demoBundle(start_date: string = DEMO_DEFAULT_START): TripBundle {
  return {
    trip: demoTrip(start_date),
    pins: demoPins(start_date),
    media: demoMedia(start_date),
    entries: demoEntries,
  };
}

/** The seeded rows in Repo.importRows() shape. */
export function demoRows(start_date: string = DEMO_DEFAULT_START): RepoRows {
  return {
    trips: [demoTrip(start_date)],
    pins: demoPins(start_date),
    media: demoMedia(start_date),
    entries: demoEntries,
    messages: demoMessages,
    vlogs: [demoVlog(start_date)],
  };
}

/** Everything the seed inserts. */
export function demoFixtures(start_date: string = DEMO_DEFAULT_START) {
  return {
    trip: demoTrip(start_date),
    pins: demoPins(start_date),
    media: demoMedia(start_date),
    photoSpecs: DEMO_PHOTO_SPECS,
    entries: demoEntries,
    messages: demoMessages,
    vlog: demoVlog(start_date),
    script: demoScript(start_date),
  };
}
