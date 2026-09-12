import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { TitleSegment } from '@pinlog/schema';

export const TitleCard: React.FC<{ segment: TitleSegment; dates: string }> = ({
  segment,
  dates,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inA = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const out = interpolate(frame, [durationInFrames - fps * 0.4, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const y = interpolate(frame, [0, fps * 0.8], [40, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{ justifyContent: 'flex-end', padding: '0 96px 300px', opacity: Math.min(inA, out) }}
    >
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(11,18,32,0.05) 30%, rgba(11,18,32,0.85) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          transform: `translateY(${y}px)`,
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.8 }}>
          Pinlog
        </div>
        <div
          style={{
            fontSize: 112,
            fontWeight: 800,
            lineHeight: 1.02,
            marginTop: 18,
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
          }}
        >
          {segment.text}
        </div>
        {segment.subtitle && (
          <div style={{ fontSize: 44, marginTop: 24, opacity: 0.9 }}>{segment.subtitle}</div>
        )}
        <div style={{ fontSize: 34, marginTop: 14, opacity: 0.7 }}>{dates}</div>
      </div>
    </AbsoluteFill>
  );
};
