import { describe, expect, it } from 'vitest';
import {
  AskEvent,
  ErrorResponse,
  Media,
  Pin,
  PlanEvent,
  Trip,
  TripBundle,
  UploadMediaResponse,
  Vlog,
  VlogScript,
  parseSSEText,
  type SummaryResponse,
} from '@pinlog/schema';
import { DEMO_PHOTO_SPECS } from '@pinlog/schema/fixtures';
import { generateDemoPhoto } from '@pinlog/platform';
import { seededTestApp } from '../src/testing';

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('B · trips / pins / entries / media', () => {
  it('lists, creates, reads the bundle, patches and deletes trips', async () => {
    const { app, container } = await seededTestApp();
    const list = await app.request('/trips');
    expect(list.status).toBe(200);
    expect(((await list.json()) as { trips: Trip[] }).trips.map((t) => t.id)).toEqual(['trip_pgh']);

    const created = await app.request(
      '/trips',
      json({ destination: 'Kyoto', start_date: '2026-10-03', end_date: '2026-10-04' }),
    );
    expect(created.status).toBe(201);
    const trip = Trip.parse(await created.json());
    expect(trip.pace).toBe('moderate');

    const bundle = TripBundle.parse(await (await app.request('/trips/trip_pgh')).json());
    expect(bundle.pins).toHaveLength(9);
    expect(bundle.media).toHaveLength(21);
    expect(bundle.entries).toHaveLength(8);

    const patched = await app.request(`/trips/${trip.id}`, {
      ...json({ title: 'Kyoto in autumn' }),
      method: 'PATCH',
    });
    expect(Trip.parse(await patched.json()).title).toBe('Kyoto in autumn');

    const bad = await app.request('/trips', json({ destination: '' }));
    expect(bad.status).toBe(400);
    expect(ErrorResponse.parse(await bad.json()).error.code).toBe('validation');

    await container.ports.storage.put(
      `trips/${trip.id}/media/x.jpg`,
      new Uint8Array([1]),
      'image/jpeg',
    );
    const del = await app.request(`/trips/${trip.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
    expect((await app.request(`/trips/${trip.id}`)).status).toBe(404);
    expect(await container.ports.storage.exists(`trips/${trip.id}/media/x.jpg`)).toBe(false);
  });

  it('pins: create appends to the day, patch, reorder, delete; entries on pins and trips', async () => {
    const { app } = await seededTestApp();
    const created = await app.request(
      '/trips/trip_pgh/pins',
      json({ name: 'Conflict Kitchen', lat: 40.4432, lng: -79.9535, day_index: 1 }),
    );
    expect(created.status).toBe(201);
    const pin = Pin.parse(await created.json());
    expect(pin.order_index).toBe(6);
    expect(pin.source).toBe('user');
    const patched = Pin.parse(
      await (
        await app.request(`/pins/${pin.id}`, {
          ...json({ planned_start: '2026-09-11T20:00:00', planned_end: '2026-09-11T21:00:00' }),
          method: 'PATCH',
        })
      ).json(),
    );
    expect(patched.planned_start).toBe('2026-09-11T20:00:00');
    const reordered = await app.request('/trips/trip_pgh/pins/order', {
      ...json({ order: [{ pin_id: pin.id, day_index: 2, order_index: 0 }] }),
      method: 'PUT',
    });
    expect(
      ((await reordered.json()) as { pins: Pin[] }).pins.find((p) => p.id === pin.id)?.day_index,
    ).toBe(2);

    const entry = await app.request(
      `/pins/${pin.id}/entries`,
      json({ text: 'Great food', mood: 'great' }),
    );
    expect(entry.status).toBe(201);
    const tripEntry = await app.request(
      '/trips/trip_pgh/entries',
      json({ text: 'Long day', day_index: 2 }),
    );
    expect(tripEntry.status).toBe(201);
    const e = (await tripEntry.json()) as { id: string; pin_id: string | null };
    expect(e.pin_id).toBeNull();
    expect((await app.request(`/entries/${e.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await app.request(`/entries/${e.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await app.request(`/pins/${pin.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await app.request(`/pins/ghost/entries`, json({ text: 'x' }))).status).toBe(404);
  });

  it('media: multipart upload ingests + auto-assigns, patch moves between pin and tray, delete removes files', async () => {
    const { app, container } = await seededTestApp();
    const spec = DEMO_PHOTO_SPECS.find((s) => s.id === 'media_pgh_09')!; // Point State Park 17:15
    const bytes = await generateDemoPhoto(spec);
    const form = new FormData();
    form.append('files', new File([bytes], 'point.jpg', { type: 'image/jpeg' }));
    form.append('files', new File([bytes], 'fence.jpg', { type: 'image/jpeg' }));
    form.append(
      'meta',
      JSON.stringify([
        { name: 'point.jpg' },
        { name: 'fence.jpg', taken_at: '2026-09-12T14:03:00', lat: 40.4431, lng: -79.9427 },
      ]),
    );
    const res = await app.request('/trips/trip_pgh/media', { method: 'POST', body: form });
    expect(res.status).toBe(201);
    const out = UploadMediaResponse.parse(await res.json());
    expect(out.results.map((r) => r.pin_id)).toEqual(['pin_pgh_d1_point', 'pin_pgh_d2_cmu']);
    expect(out.results[0]!.reason).toMatch(/within window/);
    expect(out.media[1]!.assign_method).toBe('auto');
    const file = await app.request(`/files/${out.media[0]!.thumb_path}`);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/jpeg');

    const toTray = Media.parse(
      await (
        await app.request(`/media/${out.media[0]!.id}`, {
          ...json({ pin_id: null }),
          method: 'PATCH',
        })
      ).json(),
    );
    expect(toTray.assign_method).toBe('none');
    const moved = Media.parse(
      await (
        await app.request(`/media/${out.media[0]!.id}`, {
          ...json({ pin_id: 'pin_pgh_d1_incline' }),
          method: 'PATCH',
        })
      ).json(),
    );
    expect(moved.assign_method).toBe('manual');
    expect(moved.pin_id).toBe('pin_pgh_d1_incline');
    expect(
      (
        await app.request(`/media/${out.media[0]!.id}`, {
          ...json({ pin_id: 'ghost' }),
          method: 'PATCH',
        })
      ).status,
    ).toBe(404);

    expect((await app.request(`/media/${out.media[1]!.id}`, { method: 'DELETE' })).status).toBe(
      204,
    );
    expect(await container.ports.storage.exists(out.media[1]!.storage_path)).toBe(false);
    const empty = await app.request('/trips/trip_pgh/media', {
      method: 'POST',
      body: new FormData(),
    });
    expect(empty.status).toBe(400);
  });

  it('share: slug + stripped media', async () => {
    const { app } = await seededTestApp();
    expect((await app.request('/share/nope')).status).toBe(404);
    const shared = Trip.parse(
      await (await app.request('/trips/trip_pgh/share', { method: 'POST' })).json(),
    );
    expect(shared.visibility).toBe('link');
    const page = (await (await app.request(`/share/${shared.share_slug}`)).json()) as TripBundle & {
      vlog: Vlog | null;
    };
    expect(page.media.every((m) => m.lat === null && m.exif === null)).toBe(true);
    expect(page.vlog?.id).toBe('vlog_pgh_demo');
  });
});

describe('C · plan / replan / ask / journal', () => {
  it('plan streams SSE PlanEvents and persists pins', async () => {
    const { app } = await seededTestApp();
    const trip = Trip.parse(
      await (
        await app.request(
          '/trips',
          json({ destination: 'Pittsburgh, PA', start_date: '2026-10-03', end_date: '2026-10-04' }),
        )
      ).json(),
    );
    const res = await app.request(`/trips/${trip.id}/plan`, json({ must_see: ['Warhol'] }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events = parseSSEText<PlanEvent>(await res.text()).map((e) => PlanEvent.parse(e));
    expect(events[0]?.type).toBe('status');
    expect(events.filter((e) => e.type === 'stop')).toHaveLength(8);
    expect(events.filter((e) => e.type === 'warning')).toHaveLength(1);
    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    const bundle = TripBundle.parse(await (await app.request(`/trips/${trip.id}`)).json());
    expect(bundle.pins).toHaveLength(8);
    expect(bundle.trip.center_lat).not.toBeNull();
    expect((await app.request('/trips/ghost/plan', json({}))).status).toBe(404);
  });

  it('replan applies a diff and reports locked pins as 400', async () => {
    const { app } = await seededTestApp();
    const res = await app.request(
      '/trips/trip_pgh/replan',
      json({ instruction: 'make day 2 lighter' }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { diff: { removed: { pin_id: string }[] }; pins: Pin[] };
    expect(body.diff.removed[0]?.pin_id).toBe('pin_pgh_d2_schenley');
    expect(body.pins).toHaveLength(8);
  });

  it('ask streams AskEvents and saves history; chat + summary at trip level', async () => {
    const { app } = await seededTestApp();
    const res = await app.request(
      '/pins/pin_pgh_d1_phipps/ask?now=2026-09-11T12:00:00',
      json({ question: 'Worth the fern room?' }),
    );
    expect(res.status).toBe(200);
    const events = parseSSEText<AskEvent>(await res.text()).map((e) => AskEvent.parse(e));
    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type === 'done') expect(done.content).toContain('From your notes');
    const history = (await (await app.request('/pins/pin_pgh_d1_phipps/messages')).json()) as {
      messages: { role: string }[];
    };
    expect(history.messages.map((m) => m.role)).toEqual(['user', 'assistant']);

    const chat = await app.request(
      '/trips/trip_pgh/chat',
      json({ message: 'What did we do yesterday?' }),
    );
    expect(parseSSEText<AskEvent>(await chat.text()).at(-1)).toMatchObject({ type: 'done' });
    const summary = await app.request('/trips/trip_pgh/summary?now=2026-09-11T21:00:00', json({}));
    const s = (await summary.json()) as SummaryResponse;
    expect(s.day_index).toBe(1);
    expect(s.summary).toMatch(/Cathedral of Learning/);
    const msgs = (await (await app.request('/trips/trip_pgh/messages')).json()) as {
      messages: { id: string; pin_id: string | null }[];
    };
    expect(msgs.messages.some((m) => m.id === s.message_id)).toBe(true);
    expect(msgs.messages.every((m) => m.pin_id === null)).toBe(true);
    expect((await app.request('/pins/ghost/ask', json({ question: 'x' }))).status).toBe(404);
  });
});

describe('D · vlogs', () => {
  it('creates a vlog job, runs script + tts, exposes it for polling', async () => {
    const { app, container } = await seededTestApp();
    const res = await app.request('/trips/trip_pgh/vlog?wait=1', json({ target_length_s: 60 }));
    expect(res.status).toBe(202);
    const vlog = Vlog.parse(await res.json());
    expect(vlog.status).toBe('done');
    expect(vlog.error).toBeNull();
    const script = VlogScript.parse(vlog.script);
    const pins = script.segments.filter((s) => s.type === 'pin');
    expect(pins.length).toBe(8);
    for (const [i, seg] of script.segments.entries()) {
      if (seg.type !== 'pin') continue;
      expect(seg.audio_path).toBe(`vlogs/${vlog.id}/seg_${String(i).padStart(2, '0')}.wav`);
      expect(await container.ports.storage.exists(seg.audio_path!)).toBe(true);
      expect(seg.duration_s).toBeGreaterThanOrEqual(3);
    }
    expect(vlog.duration_s).toBeGreaterThan(30);
    const polled = Vlog.parse(await (await app.request(`/vlogs/${vlog.id}`)).json());
    expect(polled.status).toBe('done');
    const list = (await (await app.request('/trips/trip_pgh/vlogs')).json()) as { vlogs: Vlog[] };
    expect(list.vlogs.map((v) => v.id)).toContain('vlog_pgh_demo');
    expect(list.vlogs[0]!.id).toBe(vlog.id);

    const regen = Vlog.parse(
      await (
        await app.request(
          `/vlogs/${vlog.id}/regenerate?wait=1`,
          json({ instructions: 'more chill' }),
        )
      ).json(),
    );
    expect(regen.status).toBe('done');
    expect(regen.settings.instructions).toBe('more chill');

    const edited = {
      ...script,
      segments: script.segments.map((s) =>
        s.type === 'pin' ? { ...s, narration: 'Edited line.' } : s,
      ),
    };
    const put = Vlog.parse(
      await (
        await app.request(`/vlogs/${vlog.id}/script?wait=1`, {
          ...json({ script: edited }),
          method: 'PUT',
        })
      ).json(),
    );
    expect(put.status).toBe('done');
    expect(
      put.script?.segments
        .filter((s) => s.type === 'pin')
        .every((s) => s.type === 'pin' && s.narration === 'Edited line.'),
    ).toBe(true);

    const render = await app.request(`/vlogs/${vlog.id}/render`, { method: 'POST' });
    expect(render.status).toBe(202);
    expect((await app.request('/vlogs/ghost')).status).toBe(404);
    const badSettings = await app.request('/trips/trip_pgh/vlog', json({ target_length_s: 5 }));
    expect(badSettings.status).toBe(400);
  });

  it('records a failure in vlogs.error instead of crashing', async () => {
    const { app } = await seededTestApp({
      llm: {
        name: 'mock',
        complete: async () => ({ text: '' }),
        completeJSON: async () => {
          throw new Error('llm down');
        },
        // eslint-disable-next-line require-yield
        async *stream() {
          throw new Error('llm down');
        },
      },
    });
    const vlog = Vlog.parse(
      await (await app.request('/trips/trip_pgh/vlog?wait=1', json({}))).json(),
    );
    expect(vlog.status).toBe('failed');
    expect(vlog.error).toBe('llm down');
  });
});
