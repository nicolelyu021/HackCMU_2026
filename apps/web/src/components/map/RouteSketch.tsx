'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pin } from '@pinlog/schema';
import { projectPins } from '@/lib/tripStats';
import { dayColor } from '@/lib/format';
import { ArtIcon } from '@/components/ArtIcon';

/** An explicitly schematic route: real pin coordinates, no invented streets. */
export function RouteSketch({
  pins,
  onSelectPin,
  selectedPinId,
  deskFraction,
}: {
  pins: Pin[];
  onSelectPin: (id: string | null) => void;
  selectedPinId: string | null;
  deskFraction: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 340 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const { width, height } = size;
  const points = useMemo(
    () =>
      projectPins(pins, Math.max(width - 80, 1), Math.max(height - 114, 1), 20).map((p) => ({
        x: p.x + 40,
        y: p.y + 64,
      })),
    [pins, width, height],
  );
  const days = [...new Set(pins.map((p) => p.day_index))];
  return (
    <div className="route-sketch-layer" style={{ bottom: `${deskFraction * 100}%` }} ref={ref}>
      <div className="route-sketch-label">
        <span className="font-display text-2xl">The path we took</span>
        <span>A sketch of your stops · not street directions</span>
      </div>
      <svg width={width} height={height} aria-hidden="true">
        <defs>
          <pattern id="notebook-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="#b3a994" strokeWidth=".5" opacity=".22" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#notebook-grid)" />
        {days.map((day) => {
          const route = points.filter((_, i) => pins[i]?.day_index === day);
          const d = route.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
          return (
            <g key={day}>
              <path d={d} fill="none" stroke="#fcf9f1" strokeWidth="7" />
              <path
                d={d}
                fill="none"
                stroke={dayColor(day)}
                strokeWidth="2.2"
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        <path
          d={`M${width - 30} 20l-5 16 5-4 5 4z`}
          fill="#a291b0"
          stroke="#776d5e"
          strokeWidth="1"
        />
        <text
          x={width - 30}
          y="49"
          textAnchor="middle"
          fill="#817765"
          fontSize="12"
          fontFamily="Patrick Hand"
        >
          N
        </text>
      </svg>
      {pins.map((pin, i) => (
        <button
          key={pin.id}
          className={`sketch-stop ${selectedPinId === pin.id ? 'selected' : ''}`}
          data-edge={
            (points[i]?.x ?? 0) < 100
              ? 'left'
              : (points[i]?.x ?? 0) > width - 100
                ? 'right'
                : 'middle'
          }
          style={{ left: points[i]?.x, top: points[i]?.y }}
          onClick={() => onSelectPin(pin.id)}
          aria-label={`Open ${pin.name}`}
        >
          <span className="sketch-stop-number">{i + 1}</span>
          {height > 210 && <span className="sketch-stop-label">{pin.name}</span>}
        </button>
      ))}
      {pins.length === 0 && (
        <p className="absolute inset-x-6 top-1/2 text-center font-display text-2xl text-muted">
          A blank page, waiting for your first stop.
        </p>
      )}
      {height > 260 && (
        <div className="sketch-clover" aria-hidden="true">
          <ArtIcon name="clover" size={63} />
          <span>take the scenic way</span>
        </div>
      )}
    </div>
  );
}
