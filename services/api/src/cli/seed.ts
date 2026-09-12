import { parseArgs } from 'node:util';
import { seedFixtures } from '@pinlog/platform';
import { silentWav } from '@pinlog/tts';
import { createContainer } from '../container';
import { loadEnv } from '../env';

/**
 * Owner B. `pnpm seed [--reset] [--start YYYY-MM-DD] [--photos copy|generate|skip]`
 * Creates data/pinlog.db + data/files from the frozen fixtures (trip_pgh: 9 pins, 21 photos, 8 notes, a finished vlog).
 */
const { values } = parseArgs({
  options: {
    reset: { type: 'boolean', default: false },
    start: { type: 'string' },
    photos: { type: 'string', default: 'copy' },
  },
});
const photos = values.photos as 'copy' | 'generate' | 'skip';
if (!['copy', 'generate', 'skip'].includes(photos)) {
  console.error(`--photos must be copy | generate | skip (got ${photos})`);
  process.exit(2);
}

const env = loadEnv();
const container = createContainer(env);
const t0 = Date.now();
const result = await seedFixtures(container.ports, {
  reset: values.reset,
  start_date: values.start,
  photos,
  audio: (seconds) => silentWav(seconds, 8000),
});
console.log(
  result.seeded
    ? `[seed] ok in ${Date.now() - t0} ms → ${container.data_dir} · trip ${result.trip_id}: ${result.pins} pins, ${result.media} photos, ${result.entries} notes, vlog ${result.vlog_id}`
    : `[seed] nothing to do (run with --reset to recreate)`,
);
container.ports.repo.close();
