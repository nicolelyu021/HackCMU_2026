'use client';
import Link from 'next/link';
import { isFixtureMode } from '@/lib/config';
import { cx } from './ui';

export type TabKey = 'trips' | 'map' | 'journal' | 'vlog';

/** Phone navigation (hidden on md+ where the top bar carries the actions). Journal is a panel on the map page. */
export function TabBar({
  tripId,
  active,
  onJournal,
}: {
  tripId: string;
  active: TabKey;
  onJournal?: () => void;
}) {
  const q = typeof window !== 'undefined' && isFixtureMode() ? '?fixture=1' : '';
  const tab = (on: boolean) =>
    cx(
      'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium',
      on ? 'text-slate-900' : 'text-slate-500',
    );
  const journalHref = `/trips/${tripId}${q ? `${q}&` : '?'}panel=journal`;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200/70 bg-white/92 px-2 pt-1.5 backdrop-blur md:hidden">
      <Link href={`/${q}`} className={tab(active === 'trips')}>
        <span className="text-xl leading-none">🧭</span>Trips
      </Link>
      <Link href={`/trips/${tripId}${q}`} className={tab(active === 'map')}>
        <span className="text-xl leading-none">🗺️</span>Map
      </Link>
      {onJournal ? (
        <button onClick={onJournal} className={tab(active === 'journal')}>
          <span className="text-xl leading-none">💬</span>Journal
        </button>
      ) : (
        <Link href={journalHref} className={tab(active === 'journal')}>
          <span className="text-xl leading-none">💬</span>Journal
        </Link>
      )}
      <Link href={`/trips/${tripId}/vlog${q}`} className={tab(active === 'vlog')}>
        <span className="text-xl leading-none">🎬</span>Vlog
      </Link>
    </nav>
  );
}
