'use client';
import type { Pin, Trip } from '@pinlog/schema';
import { prettyDate } from '@/lib/format';
import { projectPins } from '@/lib/tripStats';
import { cx } from '@/components/ui';
import { PencilArrow } from '@/components/ArtIcon';

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
  const city = trip.destination.split(',')[0] ?? trip.destination;
  const isPittsburgh = /pittsburgh/i.test(trip.destination);
  const points = projectPins(
    [...pins].sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index),
    420,
    220,
    35,
  );
  return (
    <article className={cx('city-postcard', compact && 'compact', className)}>
      <div className="postcard-picture">
        {isPittsburgh ? (
          <img
            src="/art/pittsburgh-postcard.png"
            alt="Pittsburgh's bridges and hills, sketched in pencil"
            width={1536}
            height={1024}
          />
        ) : (
          <svg
            viewBox="0 0 420 220"
            aria-label={`Route through ${city}`}
            role="img"
            className="route-sketch"
          >
            <path
              d="M0 148Q65 93 134 153T290 137T420 156"
              stroke="#d2cbc1"
              strokeWidth="25"
              fill="none"
            />
            <path
              d={points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#9182a9"
              strokeWidth="2.5"
              strokeDasharray="5 5"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#fcf9f1"
                stroke="#625c53"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        )}
        <span className="postcard-tape" aria-hidden="true" />
        <span className="postcard-stamp">
          {trip.status === 'active' ? 'on the road' : 'a little adventure'}
        </span>
      </div>
      <div className="postcard-caption">
        <div>
          <span className="eyebrow">
            {prettyDate(trip.start_date)} — {prettyDate(trip.end_date)}
          </span>
          <h3>{trip.title}</h3>
          <p>
            {city}
            {stats
              ? ` · ${stats.pins} places · ${stats.photos} photos · ${stats.km} km wandered`
              : ''}
          </p>
        </div>
        <PencilArrow />
      </div>
    </article>
  );
}
