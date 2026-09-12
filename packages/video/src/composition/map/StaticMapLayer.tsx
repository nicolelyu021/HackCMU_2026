import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { RenderPin, VlogScript } from '@pinlog/schema';
import { segmentAtFrame } from '../timing';
import { StaticRouteCard } from './StaticRouteCard';

/** Deterministic map for renders — and the fallback when MapLibre cannot load in the Player (offline, no WebGL). */
export const StaticMapLayer: React.FC<{ script: VlogScript; pins: RenderPin[] }> = ({
  script,
  pins,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { index } = segmentAtFrame(script, frame, fps);
  const seg = script.segments[index]!;
  const pinIds = pins.map((p) => p.id);
  const activeId = seg.type === 'pin' ? seg.pin_id : null;
  const reachedIndex = activeId
    ? pinIds.indexOf(activeId)
    : seg.type === 'outro'
      ? pinIds.length - 1
      : -1;
  const progress = pinIds.length > 1 ? Math.max(0, reachedIndex) / (pinIds.length - 1) : 1;
  return (
    <AbsoluteFill>
      <StaticRouteCard
        pins={pins}
        width={width}
        height={height}
        progress={progress}
        activePinId={activeId}
        showLabels={false}
      />
    </AbsoluteFill>
  );
};
