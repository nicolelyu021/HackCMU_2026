'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Trip, TripBundle } from '@pinlog/schema';
import { api } from '@/lib/api';
import { tripStats } from '@/lib/tripStats';
import { CityCard } from '@/components/cover/CityCard';
import { Dock } from '@/components/Dock';
import { ArtIcon, PencilArrow } from '@/components/ArtIcon';
import { UserChip } from '@/components/UserChip';
import { useFixtureQuery, useHealth } from '@/lib/hooks';

export default function ShelfPage() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [bundles, setBundles] = useState<Record<string, TripBundle>>({});
  const [error, setError] = useState<string | null>(null);
  const health = useHealth();
  const q = useFixtureQuery();
  useEffect(() => {
    let alive = true;
    api
      .listTrips()
      .then(async (list) => {
        if (!alive) return;
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
        if (alive) setBundles(Object.fromEntries(pairs.filter((p) => p !== null)));
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <main className="shelf-page">
      <header className="shelf-header">
        <Link href={`/${q}`} className="brand">
          <ArtIcon name="clover" size={44} />
          <span>
            pinlog<span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="header-note">a little place for your adventures</span>
        <div className="shelf-header-right">
          <UserChip />
          <span className="demo-stamp">
            {health?.mode === 'live' ? 'on the road' : 'demo notebook'}
          </span>
        </div>
      </header>
      <div className="shelf-content">
        <section className="shelf-welcome">
          <div className="welcome-copy">
            <p className="eyebrow">Your travel shelf</p>
            <h1>
              Go somewhere.
              <br />
              Keep a little of it.
            </h1>
            <p>
              The places, the detours, the things you almost forgot.
              <br className="desktop-break" /> Every journey deserves a page.
            </p>
            <Link href={`/trips/new${q}`} className="pencil-button primary">
              Start a new trip <PencilArrow />
            </Link>
            <span className="welcome-footnote">big adventures. small, lovely memories.</span>
          </div>
          <img
            className="welcome-art"
            src="/art/travel-desk.png"
            alt="A pencil-drawn travel desk, with a notebook, camera and a cup of tea by the window"
            width={1536}
            height={1024}
            fetchPriority="high"
          />
        </section>
        <section className="journeys-section" aria-labelledby="journeys-title">
          <div className="section-heading">
            <h2 id="journeys-title">
              Your little journeys <span>({trips?.length ?? 0})</span>
            </h2>
            <span className="hand-note">pick up where you left off</span>
          </div>
          {error && (
            <div
              role="alert"
              className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          {!trips && !error && <p className="py-8 text-muted">Opening your travel shelf…</p>}
          <ul className="journey-grid">
            {trips?.map((trip) => {
              const b = bundles[trip.id];
              const stats = b ? tripStats(b) : undefined;
              return (
                <li key={trip.id} className="journey-item">
                  <Link href={`/trips/${trip.id}${q}`} aria-label={`Open ${trip.title}`}>
                    <CityCard trip={trip} pins={b?.pins} stats={stats} />
                  </Link>
                  <div className="journey-shortcuts">
                    <Link href={`/trips/${trip.id}${q ? `${q}&` : '?'}panel=scrapbook`}>
                      <ArtIcon name="scrapbook" size={30} />
                      Open scrapbook
                    </Link>
                    <Link href={`/trips/${trip.id}${q ? `${q}&` : '?'}panel=vlog`}>
                      <ArtIcon name="vlog" size={30} />
                      Make a little film
                    </Link>
                  </div>
                </li>
              );
            })}
            <li className="new-journey">
              <Link href={`/trips/new${q}`}>
                <ArtIcon name="satchel" size={118} />
                <h3>Somewhere new?</h3>
                <p>
                  An empty page.
                  <br />A whole world to wander.
                </p>
                <span className="hand-link">
                  Plan a little adventure <PencilArrow />
                </span>
              </Link>
            </li>
          </ul>
        </section>
        <footer className="shelf-footer">
          <span className="pencil-flourish" aria-hidden="true">
            ~
          </span>{' '}
          Made of places. Kept with love.{' '}
          <span className="pencil-flourish" aria-hidden="true">
            ~
          </span>
        </footer>
      </div>
      <Dock active="shelf" tripId={trips?.[0]?.id} />
    </main>
  );
}
