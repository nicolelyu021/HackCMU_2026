import React from 'react';
import { AbsoluteFill } from 'remotion';
import type { RenderPin } from '@pinlog/schema';
import { polylineLength, projectPins } from './project';

export interface StaticRouteCardProps {
  pins: RenderPin[];
  width: number;
  height: number;
  /** 0..1 — how much of the route is drawn. */
  progress: number;
  /** Highlighted pin (current segment), if any. */
  activePinId?: string | null;
  showLabels?: boolean;
}

/** Deterministic SVG "map": dark ground, route draw-on, numbered pins. Used for MP4 renders and as the outro card. */
export const StaticRouteCard: React.FC<StaticRouteCardProps> = ({
  pins,
  width,
  height,
  progress,
  activePinId,
  showLabels = true,
}) => {
  const pts = projectPins(pins, { width, height, padding: Math.round(width * 0.14) });
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const total = polylineLength(pts);
  const drawn = total * Math.max(0, Math.min(1, progress));
  // a pin appears once the drawn length reaches it
  let acc = 0;
  const reached = pts.map((p, i) => {
    if (i > 0) acc += Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y);
    return acc <= drawn + 0.5;
  });
  return (
    <AbsoluteFill
      style={{ background: 'radial-gradient(120% 80% at 50% 30%, #1f2a3a 0%, #0b1220 70%)' }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <pattern id="grid" width="90" height="90" patternUnits="userSpaceOnUse">
            <path
              d="M 90 0 L 0 0 0 90"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.05"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        {pts.length > 1 && (
          <>
            <path
              d={d}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.12"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={d}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${total} ${total}`}
              strokeDashoffset={total - drawn}
            />
          </>
        )}
        {pts.map((p, i) =>
          reached[i] ? (
            <g key={p.pin.id} transform={`translate(${p.x} ${p.y})`}>
              <circle
                r={p.pin.id === activePinId ? 30 : 22}
                fill={p.pin.id === activePinId ? '#f97316' : '#fbbf24'}
                stroke="#0b1220"
                strokeWidth="6"
              />
              <text
                y={9}
                textAnchor="middle"
                fontSize={24}
                fontWeight={800}
                fill="#0b1220"
                fontFamily="system-ui, -apple-system, Helvetica, Arial, sans-serif"
              >
                {i + 1}
              </text>
              {showLabels && (
                <text
                  x={38}
                  y={10}
                  fontSize={30}
                  fontWeight={600}
                  fill="#ffffff"
                  fillOpacity={0.92}
                  fontFamily="system-ui, -apple-system, Helvetica, Arial, sans-serif"
                  style={{
                    paintOrder: 'stroke',
                    stroke: '#0b1220',
                    strokeWidth: 8,
                    strokeLinejoin: 'round',
                  }}
                >
                  {p.pin.name.length > 26 ? `${p.pin.name.slice(0, 24)}…` : p.pin.name}
                </text>
              )}
            </g>
          ) : null,
        )}
      </svg>
    </AbsoluteFill>
  );
};
