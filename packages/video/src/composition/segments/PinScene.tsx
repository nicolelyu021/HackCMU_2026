import React from 'react';
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { fileUrl, type PinSegment, type RenderMedia } from '@pinlog/schema';
import { flyoverFrames, photoSlots } from '../timing';

export interface PinSceneProps {
  segment: PinSegment;
  media: Record<string, RenderMedia>;
  files_base_url: string;
  pinName: string;
  dayIndex: number;
}

const kenBurnsStyle = (
  kind: PinSegment['photos'][number]['kenburns'],
  t: number,
): React.CSSProperties => {
  const s = 1 + 0.12 * t;
  switch (kind) {
    case 'zoom_in':
      return { transform: `scale(${s})` };
    case 'zoom_out':
      return { transform: `scale(${1.12 - 0.12 * t})` };
    case 'pan_left':
      return { transform: `scale(1.14) translateX(${4 - 8 * t}%)` };
    case 'pan_right':
      return { transform: `scale(1.14) translateX(${-4 + 8 * t}%)` };
  }
};

/** Flyover (map visible) → photos with Ken Burns in a card → caption + narration subtitle; narration audio. */
export const PinScene: React.FC<PinSceneProps> = ({
  segment,
  media,
  files_base_url,
  pinName,
  dayIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const fly = Math.min(flyoverFrames(fps), Math.floor(durationInFrames * 0.4));
  const photos = segment.photos.filter((p) => media[p.media_id]);
  const slots = photoSlots(photos.length, durationInFrames, fps);
  const fade = Math.round(fps * 0.4);
  const cardIn = interpolate(frame, [fly - fade, fly], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionIn = interpolate(frame, [fps * 0.2, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const out = interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const cardW = width - 120;
  const cardH = Math.round(height * 0.56);
  return (
    <AbsoluteFill
      style={{
        fontFamily: 'system-ui, -apple-system, Helvetica, Arial, sans-serif',
        color: '#fff',
      }}
    >
      {segment.audio_path && <Audio src={fileUrl(files_base_url, segment.audio_path)} />}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0) 30%, rgba(11,18,32,0) 60%, rgba(11,18,32,0.9) 100%)',
        }}
      />
      {/* day chip */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 60,
          padding: '14px 26px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.14)',
          backdropFilter: 'blur(6px)',
          fontSize: 30,
          fontWeight: 600,
          opacity: captionIn * out,
        }}
      >
        Day {dayIndex}
      </div>
      {/* photo card */}
      {photos.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: Math.round(height * 0.16),
            width: cardW,
            height: cardH,
            borderRadius: 40,
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            opacity: cardIn * out,
            transform: `translateY(${(1 - cardIn) * 40}px)`,
            background: '#000',
          }}
        >
          {photos.map((p, i) => {
            const slot = slots[i]!;
            const alpha = interpolate(
              frame,
              [slot.start - fade, slot.start, slot.end, slot.end + fade],
              [0, 1, 1, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            if (alpha <= 0) return null;
            const t = interpolate(frame, [slot.start, slot.end], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const m = media[p.media_id]!;
            return (
              <Img
                key={p.media_id}
                src={m.url}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: alpha,
                  ...kenBurnsStyle(p.kenburns, t),
                }}
              />
            );
          })}
        </div>
      )}
      {/* caption + narration */}
      <div
        style={{ position: 'absolute', left: 60, right: 60, bottom: 220, opacity: captionIn * out }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
          {segment.caption || pinName}
        </div>
        {segment.narration && (
          <div
            style={{
              fontSize: 36,
              lineHeight: 1.3,
              marginTop: 18,
              opacity: 0.92,
              textShadow: '0 2px 16px rgba(0,0,0,0.7)',
            }}
          >
            {segment.narration}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
