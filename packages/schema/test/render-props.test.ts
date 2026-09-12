import { describe, expect, it } from 'vitest';
import {
  VlogRenderProps,
  buildRenderProps,
  scriptDurationInFrames,
  segmentStartFrames,
} from '../src/index';
import { demoBundle, demoScript } from '../src/fixtures/index';

describe('render props', () => {
  it('builds valid props with only referenced media and resolved urls', () => {
    const script = demoScript();
    const props = buildRenderProps(script, demoBundle(), {
      files_base_url: 'http://localhost:8787/files/',
      map_style_url: 'https://tiles.openfreemap.org/styles/liberty',
    });
    VlogRenderProps.parse(props);
    expect(Object.keys(props.media).length).toBe(19);
    expect(props.media['media_pgh_01']!.url).toBe(
      'http://localhost:8787/files/trips/trip_pgh/media/media_pgh_01.jpg',
    );
    expect(props.pins.map((p) => p.id)[0]).toBe('pin_pgh_d1_cathedral');
    expect(props.map_mode).toBe('maplibre');
  });
  it('computes frame timing', () => {
    const script = demoScript();
    const starts = segmentStartFrames(script);
    expect(starts[0]).toBe(0);
    expect(starts[1]).toBe(90);
    expect(scriptDurationInFrames(script)).toBe(
      Math.round(script.segments.reduce((s, x) => s + x.duration_s, 0) * 30),
    );
  });
});
