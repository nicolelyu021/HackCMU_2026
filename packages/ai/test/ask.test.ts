import { describe, expect, it } from 'vitest';
import { createMemoryRepo, type AskEvent } from '@pinlog/schema';
import { demoFixtures } from '@pinlog/schema/fixtures';
import {
  ask,
  chat,
  createLLM,
  describePinContext,
  describeTimeline,
  summarize,
} from '../src/index';

const setup = () => ({
  repo: createMemoryRepo(demoFixtures()),
  llm: createLLM('mock', { mock_delay_ms: 0 }),
});
const collect = async (it: AsyncIterable<AskEvent>) => {
  const out: AskEvent[] = [];
  for await (const ev of it) out.push(ev);
  return out;
};

describe('ask / chat / summarize (mock llm)', () => {
  it('ask streams deltas, ends with done, and persists both turns on the pin', async () => {
    const p = setup();
    const events = await collect(
      ask(
        p,
        'pin_pgh_d1_phipps',
        { question: 'Is the rain chain worth it?' },
        { now: '2026-09-11T12:00:00' },
      ),
    );
    const deltas = events.filter((e) => e.type === 'delta');
    const done = events.at(-1)!;
    expect(deltas.length).toBeGreaterThan(3);
    expect(done.type).toBe('done');
    if (done.type !== 'done') return;
    expect(done.content).toContain('From your notes: "A rain chain of little cups');
    expect(done.content).toContain('11:30 and 13:00');
    expect(deltas.map((d) => (d as { text: string }).text).join('')).toBe(done.content);
    const history = await p.repo.messages.listByPin('pin_pgh_d1_phipps');
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(history[1]!.id).toBe(done.message_id);
  });

  it('ask on an unknown pin throws NotFound', async () => {
    const p = setup();
    await expect(collect(ask(p, 'ghost', { question: 'x' }))).rejects.toThrow(
      /pin ghost not found/,
    );
  });

  it('chat persists at the trip level (pin_id null)', async () => {
    const p = setup();
    const before = (await p.repo.messages.listByTrip('trip_pgh')).length;
    const events = await collect(
      chat(p, 'trip_pgh', { message: 'What did we do yesterday?' }, { now: '2026-09-12T14:00:00' }),
    );
    expect(events.at(-1)?.type).toBe('done');
    const after = await p.repo.messages.listByTrip('trip_pgh');
    expect(after.length).toBe(before + 2);
    expect(after.every((m) => m.pin_id === null)).toBe(true);
  });

  it('summarize picks the current day, mentions the pins, and is saved as a chat exchange', async () => {
    const p = setup();
    const res = await summarize(p, 'trip_pgh', {}, { now: '2026-09-11T20:00:00' });
    expect(res.day_index).toBe(1);
    expect(res.summary).toContain('from Cathedral of Learning to The Andy Warhol Museum');
    expect(res.summary).toContain(
      'From your notes'.replace('From your notes', 'Best moment from your notes'),
    );
    const chatLog = await p.repo.messages.listByTrip('trip_pgh');
    const saved = chatLog.find((m) => m.id === res.message_id);
    expect(saved?.role).toBe('assistant');
    expect(saved?.pin_id).toBeNull();
    expect(chatLog.some((m) => m.role === 'user' && m.content === 'Summarize my day (day 1)')).toBe(
      true,
    );
    const outside = await summarize(p, 'trip_pgh', {}, { now: '2026-12-01T09:00:00' });
    expect(outside.day_index).toBe(2); // outside the trip → last day
    const explicit = await summarize(
      p,
      'trip_pgh',
      { day_index: 2 },
      { now: '2026-09-11T20:00:00' },
    );
    expect(explicit.day_index).toBe(2);
  });

  it('context builders include only the traveler’s own facts', async () => {
    const p = setup();
    const bundle = (await p.repo.trips.bundle('trip_pgh'))!;
    const pin = bundle.pins.find((x) => x.id === 'pin_pgh_d1_cathedral')!;
    const text = describePinContext({
      trip: bundle.trip,
      pin,
      pins: bundle.pins,
      entries: bundle.entries.filter((e) => e.pin_id === pin.id),
      media: bundle.media.filter((m) => m.pin_id === pin.id),
      now: '2026-09-11T10:30:00',
    });
    expect(text).toContain('note entry_pgh_01');
    expect(text).toContain('Next pin: Phipps Conservatory (11:30–13:00)');
    expect(text).toContain('Previous pin: none');
    expect(text).toContain('photo media_pgh_01 at 10:12');
    const timeline = describeTimeline(bundle, { day_index: 2, now: '2026-09-12T14:00:00' });
    expect(timeline).toContain('Day 2 · 2026-09-12');
    expect(timeline).not.toContain('Day 1 ·');
    expect(timeline).toContain('Day-level notes');
  });
});
