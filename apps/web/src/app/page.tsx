'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Trip } from '@pinlog/schema';
import { api } from '@/lib/api';
import { isFixtureMode } from '@/lib/config';
import { prettyDate } from '@/lib/format';
import { Button } from '@/components/ui';
import { TopBar } from '@/components/TopBar';

const STATUS: Record<Trip['status'], string> = {
  planning: 'Planning',
  active: 'On the road',
  completed: 'Done',
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = typeof window !== 'undefined' && isFixtureMode() ? '?fixture=1' : '';
  useEffect(() => {
    api.listTrips().then(setTrips, (e) => setError(e.message));
  }, []);
  return (
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-24">
      <TopBar />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Your trips</h1>
          <p className="mt-2 max-w-xl text-slate-600">
            Plan a trip as pins on a map, drop photos and notes onto those pins while you travel,
            then turn it into a vlog in one tap.
          </p>
        </div>
        <Link href={`/trips/new${q}`}>
          <Button size="lg">＋ New trip</Button>
        </Link>
      </div>
      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {!trips && !error && <div className="mt-8 text-slate-500">Loading…</div>}
      {trips && trips.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No trips yet. Run <code>pnpm seed</code> for the demo trip, or create one.
        </div>
      )}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {trips?.map((t) => (
          <li key={t.id}>
            <Link
              href={`/trips/${t.id}${q}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold">{t.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{t.destination}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {STATUS[t.status]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-800">
                  {prettyDate(t.start_date)} → {prettyDate(t.end_date)}
                </span>
                <span className="rounded-full bg-slate-50 px-2 py-0.5">
                  {t.party.size} {t.party.kind ?? (t.party.size === 1 ? 'solo' : 'people')}
                </span>
                {t.interests.slice(0, 3).map((i) => (
                  <span key={i} className="rounded-full bg-slate-50 px-2 py-0.5">
                    {i}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
