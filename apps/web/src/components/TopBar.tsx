'use client';
import Link from 'next/link';
import React from 'react';
import { useHealth } from '@/lib/hooks';
import { isFixtureMode } from '@/lib/config';
import { UserChip } from '@/components/UserChip';

/** Compact demo badge. Kept for leftover pages; the map room has its own desk badge. */
export function TopBar({ title, right }: { title?: React.ReactNode; right?: React.ReactNode }) {
  const health = useHealth();
  const fixture = typeof window !== 'undefined' && isFixtureMode();
  const badge = fixture
    ? 'Fixture'
    : !health
      ? 'Offline'
      : health.mode === 'mock'
        ? 'Demo'
        : 'Live';
  return (
    <header className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2">
        <Link
          href={fixture ? '/?fixture=1' : '/'}
          className="flex flex-none items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5"
        >
          <span className="font-display text-sm font-bold">Pinlog</span>
        </Link>
        {title && (
          <div className="min-w-0 truncate rounded-full border border-line bg-card px-3 py-1.5 text-sm">
            {title}
          </div>
        )}
      </div>
      <div className="pointer-events-auto flex flex-none items-center gap-2">
        {right}
        <UserChip />
        <span className="rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-medium text-muted">
          {badge}
        </span>
      </div>
    </header>
  );
}
