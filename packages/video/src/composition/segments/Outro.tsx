import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { OutroSegment, RenderPin } from '@pinlog/schema';
import { StaticRouteCard } from '../map/StaticRouteCard';

/** Route draw-on over the whole trip + the stats line + OSM attribution (docs/DECISIONS.md policies). */
export const Outro: React.FC<{ segment: OutroSegment; pins: RenderPin[]; title: string }> = ({
  segment,
  pins,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const cardIn = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const progress = interpolate(frame, [fps * 0.4, durationInFrames - fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textIn = interpolate(
    frame,
    [durationInFrames - fps * 1.6, durationInFrames - fps * 1.0],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <AbsoluteFill
      style={{
        fontFamily: 'system-ui, -apple-system, Helvetica, Arial, sans-serif',
        color: '#fff',
      }}
    >
      <AbsoluteFill style={{ opacity: cardIn }}>
        <StaticRouteCard pins={pins} width={width} height={height} progress={progress} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 120, opacity: cardIn }}>
        <div style={{ fontSize: 34, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.7 }}>
          The route
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 10 }}>{title}</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          bottom: 200,
          opacity: textIn,
          transform: `translateY(${(1 - textIn) * 30}px)`,
        }}
      >
        <div style={{ fontSize: 60, fontWeight: 800 }}>{segment.text}</div>
        <div style={{ fontSize: 28, marginTop: 24, opacity: 0.6 }}>
          © OpenStreetMap contributors · OpenFreeMap · made with Pinlog
        </div>
      </div>
    </AbsoluteFill>
  );
};
