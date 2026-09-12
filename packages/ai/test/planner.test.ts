import { describe, expect, it } from 'vitest';
import { LockedPinError, createMemoryRepo, type PlanEvent, type LLMProvider } from '@pinlog/schema';
import { demoFixtures } from '@pinlog/schema/fixtures';
import { createLLM, createPlaces, plan, replan } from '../src/index';

const ports = () => ({
  repo: createMemoryRepo(),
  llm: createLLM('mock', { mock_delay_ms: 0 }),
  places: createPlaces('mock'),
});

describe('planner (mock providers)', () => {
  it('streams status → stops/warnings → done, drops the invented place, persists pins', async () => {
    const p = ports();
    const trip = await p.repo.trips.create({
      destination: 'Pittsburgh, PA',
      start_date: '2026-10-03',
      end_date: '2026-10-04',
      party: { size: 2 },
      interests: ['museums'],
      pace: 'moderate',
      budget: 'mid',
      language: 'en',
    });
    const events: PlanEvent[] = [];
    for await (const ev of plan(p, trip, {})) events.push(ev);
    expect(events[0]).toEqual({
      type: 'status',
      stage: 'drafting',
      detail: 'Pittsburgh, PA · 2 days',
    });
    const stages = events
      .filter((e) => e.type === 'status')
      .map((e) => (e as { stage: string }).stage);
    expect(stages).toEqual(['drafting', 'resolving', 'ordering', 'saving']);
    const stops = events.filter((e) => e.type === 'stop');
    const warnings = events.filter((e) => e.type === 'warning');
    expect(stops).toHaveLength(8);
    expect(warnings).toHaveLength(1);
    expect((warnings[0] as { name: string }).name).toBe('Skyline Sky Lounge');
    const done = events.at(-1)!;
    expect(done.type).toBe('done');
    if (done.type !== 'done') return;
    expect(done.dropped).toEqual(['Skyline Sky Lounge']);
    expect(done.pins).toHaveLength(8);
    expect(done.pins.every((x) => x.place_id && x.source === 'ai')).toBe(true);
    expect(done.pins[0]!.planned_start).toBe('2026-10-03T10:00:00');
    expect(done.itinerary.days.map((d) => d.date)).toEqual(['2026-10-03', '2026-10-04']);
    expect((await p.repo.trips.get(trip.id))?.center_lat).toBeCloseTo(40.44, 1);
    // planning again replaces the AI pins instead of duplicating them, and keeps user pins
    await p.repo.pins.create({
      trip_id: trip.id,
      name: 'My hotel',
      place_id: null,
      address: null,
      lat: 40.44,
      lng: -79.99,
      day_index: 1,
      order_index: 9,
      planned_start: null,
      planned_end: null,
      kind: 'lodging',
      source: 'user',
      ai_reason: null,
    });
    const again: PlanEvent[] = [];
    for await (const ev of plan(p, trip, {})) again.push(ev);
    const done2 = again.at(-1)!;
    expect(done2.type === 'done' && done2.pins.length).toBe(9);
    expect(done2.type === 'done' && done2.pins.some((x) => x.name === 'My hotel')).toBe(true);
  });

  it('turns an LLM failure into an error event instead of throwing', async () => {
    const p = ports();
    const failing: LLMProvider = {
      ...p.llm,
      completeJSON: async () => {
        throw new Error('boom');
      },
    };
    const trip = await p.repo.trips.create({
      destination: 'Kyoto',
      start_date: '2026-10-03',
      end_date: '2026-10-03',
      party: { size: 1 },
      interests: [],
      pace: 'relaxed',
      budget: 'low',
      language: 'en',
    });
    const events: PlanEvent[] = [];
    for await (const ev of plan({ ...p, llm: failing }, trip, {})) events.push(ev);
    expect(events.at(-1)).toEqual({ type: 'error', message: 'boom' });
  });
});

describe('replan (mock providers)', () => {
  it('applies the mock diff to the demo trip', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const p = { ...ports(), repo };
    const trip = (await repo.trips.get('trip_pgh'))!;
    const res = await replan(p, trip, { instruction: 'make day 2 lighter' });
    expect(res.diff.removed.map((r) => r.pin_id)).toEqual(['pin_pgh_d2_schenley']);
    expect(res.pins.some((x) => x.id === 'pin_pgh_d2_schenley')).toBe(false);
    expect(res.pins.find((x) => x.id === 'pin_pgh_d2_strip')?.planned_end).toBe(
      '2026-09-12T10:00:00',
    );
  });
  it('refuses to touch user pins and resolves added stops', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const trip = (await repo.trips.get('trip_pgh'))!;
    const base = ports();
    const llm: LLMProvider = {
      ...base.llm,
      completeJSON: async <T>(req: { schema: { parse: (v: unknown) => T } }) =>
        req.schema.parse({
          summary: 'swap lunch',
          added: [
            {
              name: 'Gaucho Parrilla Argentina',
              search_query: 'Gaucho Parrilla Argentina',
              kind: 'food',
              start_time: '13:00',
              end_time: '14:00',
              reason: 'steak',
              day_index: 1,
            },
            {
              name: 'Nowhere Café',
              search_query: 'Nowhere Café',
              kind: 'food',
              start_time: '15:00',
              end_time: '16:00',
              reason: 'x',
              day_index: 1,
            },
          ],
          changed: [],
          removed: [{ pin_id: 'pin_pgh_d1_primanti', reason: 'user pin!' }],
        }),
    };
    await expect(
      replan({ ...base, repo, llm }, trip, { instruction: 'swap lunch' }),
    ).rejects.toBeInstanceOf(LockedPinError);
    const llmOk: LLMProvider = {
      ...llm,
      completeJSON: async <T>(req: { schema: { parse: (v: unknown) => T } }) =>
        req.schema.parse({
          summary: 'add dinner',
          added: [
            {
              name: 'Gaucho Parrilla Argentina',
              search_query: 'Gaucho Parrilla Argentina',
              kind: 'food',
              start_time: '19:00',
              end_time: '20:00',
              reason: 'steak',
              day_index: 2,
            },
            {
              name: 'Nowhere Café',
              search_query: 'Nowhere Café',
              kind: 'food',
              start_time: '15:00',
              end_time: '16:00',
              reason: 'x',
              day_index: 2,
            },
          ],
          changed: [],
          removed: [],
        }),
    };
    const res = await replan({ ...base, repo, llm: llmOk }, trip, { instruction: 'add dinner' });
    expect(res.diff.added).toHaveLength(1);
    expect(res.diff.summary).toMatch(/could not verify: Nowhere Café/);
    const added = res.pins.find((x) => x.name === 'Gaucho Parrilla Argentina')!;
    expect(added.day_index).toBe(2);
    expect(added.order_index).toBe(3);
    expect(added.planned_start).toBe('2026-09-12T19:00:00');
  });
});
