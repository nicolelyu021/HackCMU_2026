import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import {
  COMPOSITION,
  buildRenderProps,
  storageKeys,
  type Health,
  type TripBundle,
  type Vlog,
} from '@pinlog/schema';

/**
 * Owner D · stretch (docs/PLAN.md D4). Local MP4 export of a finished vlog, static map mode (deterministic).
 * Needs the API running (reads the vlog + bundle + file URLs from it) and writes data/files/vlogs/<id>/video.mp4,
 * which GET /files/vlogs/<id>/video.mp4 then serves. Usage: pnpm render -- --vlog <id> [--api http://localhost:8787] [--out file.mp4]
 */
const { values } = parseArgs({
  options: {
    vlog: { type: 'string' },
    api: { type: 'string', default: process.env.PINLOG_PUBLIC_URL ?? 'http://localhost:8787' },
    out: { type: 'string' },
    'data-dir': {
      type: 'string',
      default: process.env.PINLOG_DATA_DIR ?? resolve(import.meta.dirname, '../../../../data'),
    },
  },
});
if (!values.vlog) {
  console.error('usage: pnpm render -- --vlog <id> [--api url] [--out file.mp4]');
  process.exit(2);
}
const api = values.api!.replace(/\/+$/, '');
const get = async <T>(path: string): Promise<T> => {
  const r = await fetch(api + path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return (await r.json()) as T;
};

const health = await get<Health>('/health');
const vlog = await get<Vlog>(`/vlogs/${values.vlog}`);
if (!vlog.script) throw new Error(`vlog ${vlog.id} has no script yet (status ${vlog.status})`);
const bundleData = await get<TripBundle>(`/trips/${vlog.trip_id}`);
const inputProps = buildRenderProps(vlog.script, bundleData, {
  files_base_url: health.files_base_url,
  map_style_url: health.map_style_url,
  map_mode: 'static',
});

const out = values.out ?? join(values['data-dir']!, 'files', storageKeys.video(vlog.id));
await mkdir(dirname(out), { recursive: true });
console.log(`[render] bundling composition…`);
const serveUrl = await bundle({
  entryPoint: resolve(import.meta.dirname, '../remotion/index.ts'),
  publicDir: null,
});
const composition = await selectComposition({ serveUrl, id: COMPOSITION.id, inputProps });
console.log(`[render] ${composition.durationInFrames} frames → ${out}`);
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: out,
  inputProps,
  chromiumOptions: { gl: 'angle' },
  onProgress: ({ progress }) => process.stdout.write(`\r[render] ${(progress * 100).toFixed(0)}%`),
});
console.log(
  `\n[render] done → ${out}\n[render] served at ${health.files_base_url}/${storageKeys.video(vlog.id)}`,
);
