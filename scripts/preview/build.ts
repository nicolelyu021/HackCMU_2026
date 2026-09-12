// Builds the zero-dependency, single-file Pinlog prototype from the frozen fixtures:
//   docs/preview.html              full document (double-click to open, no API, no pnpm)
//   <out-dir>/pinlog-preview.html  body fragment (the claude.ai Artifact form) when --fragment <path> is given
// Run: pnpm preview            (tsx via @pinlog/platform, which owns sharp for the thumbnails)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  DEMO_PHOTO_SPECS,
  demoBundle,
  demoMessages,
  demoScript,
  type DemoPhotoSpec,
} from '../../packages/schema/src/fixtures/index';
import { processImage } from '../../packages/platform/src/ingest/image';
import {
  generateDemoPhoto,
  loadOrGenerateDemoPhoto,
} from '../../packages/platform/src/seed/photos';

const here = dirname(new URL(import.meta.url).pathname);
const repo = resolve(here, '../..');
const { values } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: resolve(repo, 'docs/preview.html') },
    fragment: { type: 'string' },
  },
});

const bundle = demoBundle();
const script = demoScript();

const dataUri = (bytes: Uint8Array) =>
  `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
const thumbOf = async (bytes: Uint8Array) =>
  (await processImage(bytes, { width: null, height: null })).thumb;

const thumbs: Record<string, string> = {};
for (const spec of DEMO_PHOTO_SPECS) {
  const { bytes } = await loadOrGenerateDemoPhoto(spec);
  thumbs[spec.id] = dataUri(await thumbOf(bytes));
}

// The live-demo photo (docs/DEMO.md beat 4): shot at the Fence on day 2, lands on the CMU pin.
const fenceSpec: DemoPhotoSpec = {
  id: 'media_pgh_fence_live',
  pin_id: 'pin_pgh_d2_cmu',
  expected_pin_id: 'pin_pgh_d2_cmu',
  day: 2,
  clock: '14:03',
  lat: 40.4431,
  lng: -79.9427,
  jitter: [0, 0],
  orientation: 'portrait',
  label: 'The Fence · 14:03',
  caption: 'A hand-painted wooden fence on a campus lawn, students in the background.',
  palette: ['#7f1d1d', '#f59e0b'],
};
const fence = {
  spec: fenceSpec,
  thumb: dataUri(await thumbOf(await generateDemoPhoto(fenceSpec))),
};

const data = {
  generated_at: new Date().toISOString(),
  trip: bundle.trip,
  pins: bundle.pins,
  media: bundle.media.map((m) => ({ ...m, thumb: thumbs[m.id] })),
  entries: bundle.entries,
  messages: demoMessages,
  script,
  fence: {
    id: fenceSpec.id,
    pin_id: fenceSpec.pin_id,
    taken_at: '2026-09-12T14:03:00',
    lat: fenceSpec.lat,
    lng: fenceSpec.lng,
    caption: fenceSpec.caption,
    thumb: fence.thumb,
  },
};

const template = await readFile(resolve(here, 'template.html'), 'utf8');
const fragment = template.replace(
  '/*__PINLOG_DATA__*/',
  `window.PINLOG_DATA = ${JSON.stringify(data)};`,
);
const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>[hidden]{display:none!important} body{margin:0}</style>
</head>
<body>
${fragment}
</body>
</html>
`;
await mkdir(dirname(values.out!), { recursive: true });
await writeFile(values.out!, full);
console.log(
  `[preview] ${values.out} (${(full.length / 1024).toFixed(0)} KB, ${Object.keys(thumbs).length + 1} photos embedded)`,
);
if (values.fragment) {
  await mkdir(dirname(values.fragment), { recursive: true });
  await writeFile(values.fragment, fragment);
  console.log(`[preview] fragment → ${values.fragment}`);
}
