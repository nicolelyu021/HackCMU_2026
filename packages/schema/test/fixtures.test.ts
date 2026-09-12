import { describe, expect, it } from 'vitest';
import {
  Entry,
  Media,
  Message,
  Pin,
  Trip,
  Vlog,
  VlogScript,
  ItineraryDraft,
  ReplanDraft,
} from '../src/index';
import { demoFixtures, mockPlanDraft, mockReplanDraft, mockPlaces } from '../src/fixtures/index';

describe('demo fixtures satisfy the contracts', () => {
  const f = demoFixtures();

  it('trip, pins, media, entries, messages, vlog parse', () => {
    Trip.parse(f.trip);
    f.pins.forEach((p) => Pin.parse(p));
    f.media.forEach((m) => Media.parse(m));
    f.entries.forEach((e) => Entry.parse(e));
    f.messages.forEach((m) => Message.parse(m));
    Vlog.parse(f.vlog);
    VlogScript.parse(f.script);
  });

  it('has 9 pins over 2 days with unique ids and dense order indexes', () => {
    expect(f.pins).toHaveLength(9);
    expect(new Set(f.pins.map((p) => p.id)).size).toBe(9);
    for (const day of [1, 2]) {
      const idx = f.pins
        .filter((p) => p.day_index === day)
        .map((p) => p.order_index)
        .sort();
      expect(idx).toEqual(idx.map((_, i) => i));
    }
    f.pins.filter((p) => p.source === 'ai').forEach((p) => expect(p.place_id).toBeTruthy());
  });

  it('has 18 photos: 16 assigned, 2 in the tray, all expected pins exist', () => {
    expect(f.media).toHaveLength(18);
    const pinIds = new Set(f.pins.map((p) => p.id));
    expect(f.media.filter((m) => m.pin_id).length).toBe(16);
    expect(f.media.filter((m) => !m.pin_id).length).toBe(2);
    f.media.forEach((m) => {
      if (m.pin_id) expect(pinIds.has(m.pin_id)).toBe(true);
      expect(m.assign_method).toBe(m.pin_id ? 'auto' : 'none');
    });
    // the CMU pin (live photo target) has no seeded photos
    expect(f.media.some((m) => m.pin_id === 'pin_pgh_d2_cmu')).toBe(false);
  });

  it('script references only known pins, media and entries, ≤ 4 photos per pin, 45–90 s', () => {
    const pinIds = new Set(f.pins.map((p) => p.id));
    const mediaIds = new Set(f.media.map((m) => m.id));
    const entryIds = new Set(f.entries.map((e) => e.id));
    let total = 0;
    for (const seg of f.script.segments) {
      total += seg.duration_s;
      if (seg.type !== 'pin') continue;
      expect(pinIds.has(seg.pin_id)).toBe(true);
      expect(seg.photos.length).toBeLessThanOrEqual(4);
      seg.photos.forEach((p) => expect(mediaIds.has(p.media_id)).toBe(true));
      seg.source_entry_ids?.forEach((id) => expect(entryIds.has(id)).toBe(true));
      expect(seg.audio_path).toMatch(/^vlogs\/vlog_pgh_demo\/seg_\d{2}\.wav$/);
    }
    expect(total).toBeGreaterThanOrEqual(45);
    expect(total).toBeLessThanOrEqual(90);
    expect(f.script.segments[0]!.type).toBe('title');
    expect(f.script.segments.at(-1)!.type).toBe('outro');
  });

  it('dates shift with start_date', () => {
    const g = demoFixtures('2026-10-03');
    expect(g.trip.end_date).toBe('2026-10-04');
    expect(g.pins[0]!.planned_start).toBe('2026-10-03T10:00:00');
    expect(g.media.find((m) => m.id === 'media_pgh_14')!.taken_at).toBe('2026-10-04T09:20:00');
  });

  it('mock LLM drafts parse and the mock places resolve every real stop', () => {
    const draft = ItineraryDraft.parse(mockPlanDraft(2));
    expect(draft.days).toHaveLength(2);
    ReplanDraft.parse(mockReplanDraft);
    const names = mockPlaces.map((p) => p.name.toLowerCase());
    const stops = draft.days.flatMap((d) => d.stops);
    const resolvable = stops.filter((s) =>
      names.some(
        (n) => n.includes(s.search_query.toLowerCase()) || s.search_query.toLowerCase().includes(n),
      ),
    );
    expect(stops.length - resolvable.length).toBe(1); // exactly one invented place
  });
});
