'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Trip, TripBundle } from '@pinlog/schema';
import { api } from '@/lib/api';
import { tripStats } from '@/lib/tripStats';
import { CityCard } from '@/components/cover/CityCard';
import { Dock } from '@/components/Dock';
import { useFixtureQuery, useHealth } from '@/lib/hooks';

export default function ShelfPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [bundles, setBundles] = useState<Record<string, TripBundle>>({});
  const [error, setError] = useState<string | null>(null);
  const health = useHealth();
  const q = useFixtureQuery();

  useEffect(() => {
    api
      .listTrips()
      .then(async (list) => {
        setTrips(list);
        const pairs = await Promise.all(
          list.map(async (t) => {
            try {
              return [t.id, await api.getBundle(t.id)] as const;
            } catch {
              return null;
            }
          }),
        );
        const next: Record<string, TripBundle> = {};
        for (const p of pairs) if (p) next[p[0]] = p[1];
        setBundles(next);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper">
      <header className="flex items-end justify-between px-5 pb-2 pt-10">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Pinlog
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">City memories</h1>
        </div>
        <span className="rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-medium text-muted">
          {health?.mode === 'live' ? 'Live' : 'Demo'}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {!trips && !error && <div className="py-10 text-center text-sm text-muted">Opening…</div>}
        {trips?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            No trips yet. Run <code>pnpm seed</code> or start a new one.
          </p>
        )}
        <ul className="space-y-5">
          {trips?.map((t) => {
            const b = bundles[t.id];
            const stats = b ? tripStats(b) : undefined;
            return (
              <li key={t.id}>
                <Link href={`/trips/${t.id}${q}`} className="block">
                  <CityCard trip={t} pins={b?.pins} stats={stats} />
                </Link>
                {b && (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-card">
                    <Link
                      href={`/trips/${t.id}${q}`}
                      className="flex items-center justify-between border-b border-line px-4 py-3 text-sm"
                    >
                      <span>View map</span>
                      <span className="text-muted">›</span>
                    </Link>
                    <Link
                      href={`/trips/${t.id}${q ? `${q}&` : '?'}panel=scrapbook`}
                      className="flex items-center justify-between border-b border-line px-4 py-3 text-sm"
                    >
                      <span>Generate scrapbook</span>
                      <span className="text-muted">{stats?.notes ?? 0} notes ›</span>
                    </Link>
                    <Link
                      href={`/trips/${t.id}${q ? `${q}&` : '?'}panel=vlog`}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span>Make vlog</span>
                      <span className="text-muted">›</span>
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          href={`/trips/new${q}`}
          className="mt-5 block rounded-[22px] border border-dashed border-line-strong bg-card/50 px-5 py-8 text-center"
        >
          <div className="font-display text-lg font-bold text-accent">New trip</div>
          <div className="mt-1 text-sm text-muted">Kyoto · 2 days · temples, food</div>
        </Link>
      </div>
      <Dock active="shelf" tripId={trips?.[0]?.id} />
    </main>
  );
}
