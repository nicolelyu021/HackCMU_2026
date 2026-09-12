'use client';
import Link from 'next/link';
import { useFixtureQuery } from '@/lib/hooks';
import { cx } from './ui';
import { ArtIcon } from './ArtIcon';

export type DockKey = 'shelf' | 'map' | 'scrapbook' | 'journal' | 'vlog';
const ITEMS: { key: DockKey; label: string }[] = [
  { key: 'shelf', label: 'My shelf' },
  { key: 'map', label: 'Map' },
  { key: 'scrapbook', label: 'Scrapbook' },
  { key: 'journal', label: 'Journal' },
  { key: 'vlog', label: 'Little film' },
];

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
    <nav className="notebook-dock pb-safe" aria-label="Travel notebook">
      {ITEMS.map(({ key, label }) => {
        const selected = active === key;
        const className = cx(
          'dock-object',
          selected && 'is-active',
          pulse === key && 'has-new-memory',
        );
        const content = (
          <>
            <ArtIcon name={key} size={48} />
            <span>{label}</span>
          </>
        );
        if (key === 'shelf')
          return (
            <Link
              key={key}
              href={`/${q}`}
              className={className}
              aria-current={selected ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        if (!tripId)
          return (
            <span key={key} className={cx(className, 'opacity-35')} aria-disabled="true">
              {content}
            </span>
          );
        if (onSelect)
          return (
            <button
              key={key}
              type="button"
              className={className}
              onClick={() => onSelect(key)}
              aria-pressed={selected}
            >
              {content}
            </button>
          );
        const href =
          key === 'map'
            ? `/trips/${tripId}${q}`
            : `/trips/${tripId}${q ? `${q}&` : '?'}panel=${key}`;
        return (
          <Link
            key={key}
            href={href}
            className={className}
            aria-current={selected ? 'page' : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
