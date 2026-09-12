'use client';
import type { Pin, Trip } from '@pinlog/schema';
import { prettyDate } from '@/lib/format';
import { projectPins } from '@/lib/tripStats';
import { cx } from '@/components/ui';

/** Worldo-style city poster: cream map, lavender route, serif title. */
export function CityCard({
  trip,
  pins = [],
  stats,
  className,
  compact,
}: {
  trip: Trip;
  pins?: Pick<Pin, 'lat' | 'lng' | 'day_index' | 'order_index'>[];
  stats?: { pins: number; photos: number; notes: number; km: number };
  className?: string;
  compact?: boolean;
}) {
  const ordered = [...pins].sort(
    (a, b) => a.day_index - b.day_index || a.order_index - b.order_index,
  );
  const w = 320;
  const h = compact ? 200 : 280;
  const pts = projectPins(ordered, w, h);
  const city = trip.destination.split(',')[0] ?? trip.destination;
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <div className={cx('overflow-hidden rounded-[22px] border border-line bg-card', className)}>
      <div className="relative" style={{ background: '#e7efe8' }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" aria-hidden>
          <rect width={w} height={h} fill="#e7efe8" />
          <path
            d={`M0 ${h * 0.62} C ${w * 0.25} ${h * 0.5}, ${w * 0.55} ${h * 0.78}, ${w} ${h * 0.58}`}
            fill="#d5e4f2"
            opacity="0.9"
          />
          {d && (
            <path
              d={d}
              fill="none"
              stroke="#8b7cb8"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === 0 || i === pts.length - 1 ? 5 : 3.5}
              fill="#3f3a36"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#e7efe8] to-transparent px-5 pb-4 pt-10 text-center">
          <div className="font-display text-[28px] font-extrabold leading-none tracking-tight text-ink">
            {city.toUpperCase()}
          </div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
            {trip.destination}
          </div>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
          <Stat n={stats.pins} label="pins" />
          <Stat n={stats.photos} label="photos" />
          <Stat
            n={String(stats.km)}
            label="km"
            extra={stats.notes ? `${stats.notes} notes` : undefined}
          />
        </div>
      )}
      <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
        {prettyDate(trip.start_date)} → {prettyDate(trip.end_date)}
        {trip.status === 'active' ? ' · on the road' : ''}
      </div>
    </div>
  );
}

function Stat({ n, label, extra }: { n: number | string; label: string; extra?: string }) {
  return (
    <div className="px-2 py-3">
      <div className="font-display text-xl font-bold tracking-tight">{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      {extra && <div className="text-[10px] text-muted">{extra}</div>}
    </div>
  );
}
