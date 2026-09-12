// End-to-end check of every route against a RUNNING api (pnpm dev:api, seeded). Usage: pnpm smoke [--api http://localhost:8787]
// Exits non-zero on the first failing beat. Mock or live providers both work; live runs take longer.
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { api: { type: 'string', default: process.env.API_URL ?? 'http://localhost:8787' } },
});
const API = values.api.replace(/\/+$/, '');
const t0 = Date.now();
let step = 0;

const ok = (name, cond, detail = '') => {
  step++;
  if (!cond) {
    console.error(`✗ ${step}. ${name} ${detail}`);
    process.exit(1);
  }
  console.log(`✓ ${step}. ${name}${detail ? ` — ${detail}` : ''}`);
};
const json = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const get = async (path) => {
  const r = await fetch(API + path);
  return {
    status: r.status,
    body: r.headers.get('content-type')?.includes('json') ? await r.json() : null,
    res: r,
  };
};
const sse = async (path, init) => {
  const r = await fetch(API + path, init);
  const text = await r.text();
  return text
    .split(/\n\n/)
    .map((b) =>
      b
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim())
        .join('\n'),
    )
    .filter(Boolean)
    .map((d) => JSON.parse(d));
};

const health = await get('/health');
ok(
  'GET /health',
  health.status === 200 && health.body?.ok === true,
  `mode=${health.body?.mode} llm=${health.body?.providers?.llm} places=${health.body?.providers?.places} tts=${health.body?.providers?.tts}`,
);

const trips = await get('/trips');
ok(
  'GET /trips',
  trips.status === 200 && Array.isArray(trips.body.trips),
  `${trips.body?.trips?.length} trips`,
);
const demo = trips.body.trips.find((t) => t.id === 'trip_pgh');
ok('seeded demo trip present', !!demo, demo ? demo.title : 'run pnpm seed first');

const bundle = await get('/trips/trip_pgh');
ok(
  'GET /trips/trip_pgh bundle',
  bundle.status === 200 && bundle.body.pins.length === 4 && bundle.body.media.length === 8,
  `${bundle.body?.pins?.length} pins · ${bundle.body?.media?.length} photos · ${bundle.body?.entries?.length} notes`,
);

const thumb = bundle.body.media[0];
const file = await fetch(`${API}/files/${thumb.thumb_path}`);
ok(
  'GET /files/<thumb>',
  file.status === 200 && file.headers.get('content-type') === 'image/jpeg',
  `${file.headers.get('content-length')} bytes`,
);
const range = await fetch(`${API}/files/${thumb.storage_path}`, {
  headers: { range: 'bytes=0-99' },
});
ok(
  'GET /files Range',
  range.status === 206 && range.headers.get('content-range')?.startsWith('bytes 0-99/'),
);

const created = await fetch(
  API + '/trips',
  json({
    destination: 'Pittsburgh, PA',
    start_date: '2026-10-03',
    end_date: '2026-10-04',
    interests: ['museums', 'food'],
  }),
);
const trip = await created.json();
ok('POST /trips', created.status === 201 && trip.id, trip.id);

const planEvents = await sse(`/trips/${trip.id}/plan`, json({}));
const planDone = planEvents.at(-1);
ok(
  'POST /trips/:id/plan (SSE)',
  planDone?.type === 'done',
  `${planEvents.filter((e) => e.type === 'stop').length} stops · ${planEvents.filter((e) => e.type === 'warning').length} dropped · ${planDone?.pins?.length ?? 0} pins saved`,
);

const manual = await fetch(
  API + `/trips/${trip.id}/pins`,
  json({ name: 'Our hotel', lat: 40.44, lng: -79.99, day_index: 1, kind: 'lodging' }),
);
const pin = await manual.json();
ok('POST /trips/:id/pins', manual.status === 201, pin.id);
const note = await fetch(
  API + `/pins/${pin.id}/entries`,
  json({ text: 'Checked in, view of the river.', mood: 'good' }),
);
ok('POST /pins/:id/entries', note.status === 201);

const askEvents = await sse(`/pins/${pin.id}/ask`, json({ question: 'What is the plan here?' }));
ok(
  'POST /pins/:id/ask (SSE)',
  askEvents.at(-1)?.type === 'done',
  `${askEvents.filter((e) => e.type === 'delta').length} deltas`,
);
const msgs = await get(`/pins/${pin.id}/messages`);
ok('GET /pins/:id/messages', msgs.status === 200 && msgs.body.messages.length === 2);

const chatEvents = await sse('/trips/trip_pgh/chat', json({ message: 'What did we do on day 1?' }));
ok('POST /trips/:id/chat (SSE)', chatEvents.at(-1)?.type === 'done');
const summary = await fetch(API + '/trips/trip_pgh/summary', json({ day_index: 1 }));
const s = await summary.json();
ok(
  'POST /trips/:id/summary',
  summary.status === 200 && s.summary.length > 20,
  s.summary.slice(0, 80) + '…',
);

const replan = await fetch(
  API + '/trips/trip_pgh/replan',
  json({ instruction: 'make day 2 lighter' }),
);
ok(
  'POST /trips/:id/replan',
  replan.status === 200 || replan.status === 400,
  `status ${replan.status}`,
);

const vlogRes = await fetch(API + `/trips/${trip.id}/vlog`, json({ target_length_s: 60 }));
let vlog = await vlogRes.json();
ok('POST /trips/:id/vlog → 202', vlogRes.status === 202 && vlog.status === 'queued', vlog.id);
for (let i = 0; i < 80 && !['done', 'failed'].includes(vlog.status); i++) {
  await new Promise((r) => setTimeout(r, 1500));
  vlog = (await get(`/vlogs/${vlog.id}`)).body;
}
ok(
  'GET /vlogs/:id polled to done',
  vlog.status === 'done',
  `${vlog.duration_s} s · ${vlog.script?.segments?.length} segments${vlog.error ? ` · error: ${vlog.error}` : ''}`,
);
const seg = vlog.script.segments.find((x) => x.type === 'pin');
if (seg?.audio_path) {
  const wav = await fetch(`${API}/files/${seg.audio_path}`);
  ok(
    'GET /files/<segment wav>',
    wav.status === 200 && wav.headers.get('content-type') === 'audio/wav',
  );
}

const del = await fetch(API + `/trips/${trip.id}`, { method: 'DELETE' });
ok('DELETE /trips/:id', del.status === 204);
console.log(`\nsmoke ok in ${((Date.now() - t0) / 1000).toFixed(1)} s against ${API}`);
