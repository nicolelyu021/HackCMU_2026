import { describe, expect, it } from 'vitest';
import { VlogScript, createMemoryRepo, scriptDurationS } from '@pinlog/schema';
import { demoFixtures } from '@pinlog/schema/fixtures';
import { buildTimeline, createLLM, generateScript, wordBudget } from '../src/index';

describe('vlog script (mock llm)', () => {
  it('produces a valid, grounded script from the demo trip', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const llm = createLLM('mock', { mock_delay_ms: 0 });
    const settings = {
      language: 'en' as const,
      voice: 'warm_female' as const,
      music_mood: 'calm' as const,
      target_length_s: 60,
    };
    const script = await generateScript({ repo, llm }, 'trip_pgh', settings);
    VlogScript.parse(script);
    const bundle = (await repo.trips.bundle('trip_pgh'))!;
    const pinIds = new Set(bundle.pins.map((p) => p.id));
    const entryIds = new Set(bundle.entries.map((e) => e.id));
    expect(script.segments[0]!.type).toBe('title');
    expect(script.segments.at(-1)!.type).toBe('outro');
    const pins = script.segments.filter((s) => s.type === 'pin');
    expect(pins).toHaveLength(8); // pins with photos or notes (Schenley has neither)
    for (const s of pins) {
      if (s.type !== 'pin') continue;
      expect(pinIds.has(s.pin_id)).toBe(true);
      expect(s.photos.length).toBeLessThanOrEqual(4);
      expect(s.photos.length).toBeGreaterThan(0);
      for (const ph of s.photos)
        expect(bundle.media.find((m) => m.id === ph.media_id)?.pin_id).toBe(s.pin_id);
      for (const id of s.source_entry_ids ?? []) expect(entryIds.has(id)).toBe(true);
      expect(s.narration.split(/[.!?]\s/).length).toBeLessThanOrEqual(3);
      expect(s.audio_path).toBeNull();
      expect(s.duration_s).toBeGreaterThanOrEqual(3);
    }
    const phipps = pins.find((s) => s.type === 'pin' && s.pin_id === 'pin_pgh_d1_phipps');
    expect(phipps?.type === 'pin' && phipps.narration).toContain('$3 extra for the fern room');
    expect(phipps?.type === 'pin' && phipps.source_entry_ids).toEqual(['entry_pgh_02']);
    const outro = script.segments.at(-1)!;
    expect(outro.type === 'outro' && outro.text).toMatch(/km · 9 places · 19 photos/);
    expect(scriptDurationS(script)).toBeGreaterThan(30);
    expect(scriptDurationS(script)).toBeLessThan(90);
    // regenerate with instructions + previous still works
    const again = await generateScript(
      { repo, llm },
      'trip_pgh',
      { ...settings, instructions: 'more chill' },
      { previous: script },
    );
    VlogScript.parse(again);
    // day filter
    const day2 = await generateScript({ repo, llm }, 'trip_pgh', { ...settings, day_indexes: [2] });
    expect(
      day2.segments
        .filter((s) => s.type === 'pin')
        .every((s) => s.type === 'pin' && s.day_index === 2),
    ).toBe(true);
  });

  it('timeline and word budget helpers', async () => {
    const repo = createMemoryRepo(demoFixtures());
    const bundle = (await repo.trips.bundle('trip_pgh'))!;
    const t = buildTimeline(bundle);
    expect(t.map((x) => x.pin_id)).toContain('pin_pgh_d2_cmu');
    expect(t[0]!.photos.map((p) => p.id)).toEqual(['media_pgh_01', 'media_pgh_02']);
    expect(wordBudget(60, 7).per_segment).toBeGreaterThanOrEqual(12);
    expect(wordBudget(120, 3).per_segment).toBe(40);
    await expect(
      generateScript({ repo, llm: createLLM('mock', { mock_delay_ms: 0 }) }, 'nope', {
        language: 'en',
        voice: 'warm_female',
        music_mood: 'calm',
        target_length_s: 60,
      }),
    ).rejects.toThrow(/not found/);
  });
});
