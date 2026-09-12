import { COMPOSITION, FLYOVER_S, segmentStartFrames, type VlogScript } from '@pinlog/schema';

export interface SegmentAt {
  index: number;
  /** Frames since the segment started. */
  local: number;
  /** Segment length in frames. */
  length: number;
  start: number;
}

/** Which segment is on screen at `frame` (pure). */
export function segmentAtFrame(
  script: VlogScript,
  frame: number,
  fps: number = COMPOSITION.fps,
): SegmentAt {
  const starts = segmentStartFrames(script, fps);
  let index = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]!) index = i;
  const start = starts[index]!;
  const length = Math.max(1, Math.round(script.segments[index]!.duration_s * fps));
  return { index, local: Math.max(0, frame - start), length, start };
}

export const flyoverFrames = (fps: number = COMPOSITION.fps) => Math.round(FLYOVER_S * fps);

/** Photo slots inside a pin segment: after the flyover, photos share the rest equally, with a short crossfade. */
export function photoSlots(
  photoCount: number,
  segmentFrames: number,
  fps: number = COMPOSITION.fps,
): { start: number; end: number }[] {
  const fly = Math.min(flyoverFrames(fps), Math.floor(segmentFrames * 0.4));
  const avail = Math.max(1, segmentFrames - fly);
  const n = Math.max(1, photoCount);
  const slot = avail / n;
  return Array.from({ length: n }, (_, i) => ({
    start: Math.round(fly + i * slot),
    end: i === n - 1 ? segmentFrames : Math.round(fly + (i + 1) * slot),
  }));
}
