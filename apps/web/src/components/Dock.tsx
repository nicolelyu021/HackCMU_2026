'use client';
import Link from 'next/link';
import { useFixtureQuery } from '@/lib/hooks';
import { cx } from './ui';

export type DockKey = 'shelf' | 'map' | 'scrapbook' | 'journal' | 'vlog';

const ITEMS: { key: DockKey; label: string; icon: string }[] = [
  { key: 'shelf', label: 'Shelf', icon: '▤' },
  { key: 'map', label: 'Map', icon: '◎' },
  { key: 'scrapbook', label: 'Scrapbook', icon: '❐' },
  { key: 'journal', label: 'Journal', icon: '✎' },
  { key: 'vlog', label: 'Vlog', icon: '▶' },
];

/** Furniture at the bottom of the notebook — not a second website. */
export function Dock({
  tripId,
  active,
  onSelect,
  pulse,
}: {
  tripId?: string;
  active: DockKey;
  onSelect?: (key: DockKey) => void;
  pulse?: DockKey | null;
}) {
  const q = useFixtureQuery();
  return (
    <nav className="pb-safe grid flex-none grid-cols-5 border-t border-line-strong bg-paper px-1 pt-1">
      {ITEMS.map((it) => {
        const on = active === it.key;
        const className = cx(
          'flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium tracking-wide',
          on ? 'text-accent' : 'text-muted',
          pulse === it.key && 'ring-1 ring-accent',
        );
        if (it.key === 'shelf') {
          return (
            <Link key={it.key} href={`/${q}`} className={className}>
              <span className="font-display text-lg leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        }
        if (!tripId) {
          return (
            <span key={it.key} className={cx(className, 'opacity-40')}>
              <span className="font-display text-lg leading-none">{it.icon}</span>
              {it.label}
            </span>
          );
        }
        if (onSelect) {
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onSelect(it.key)}
              className={className}
            >
              <span className="font-display text-lg leading-none">{it.icon}</span>
              {it.label}
            </button>
          );
        }
        const href =
          it.key === 'map'
            ? `/trips/${tripId}${q}`
            : `/trips/${tripId}${q ? `${q}&` : '?'}panel=${it.key}`;
        return (
          <Link key={it.key} href={href} className={className}>
            <span className="font-display text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
