'use client';
import { useState } from 'react';
import type { Budget, Pace } from '@pinlog/schema';
import { api } from '@/lib/api';
import { Button, Chip, cx } from '@/components/ui';

const INTERESTS = [
  'temples',
  'food',
  'museums',
  'views',
  'nature',
  'nightlife',
  'markets',
  'architecture',
  'coffee',
  'art',
];
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** PLAN-1: destination, dates, party, interests, pace, budget in ≤ 5 taps. */
export function NewTripForm({
  onCreated,
}: {
  onCreated: (tripId: string, mustSee?: string) => void;
}) {
  const [destination, setDestination] = useState('Kyoto');
  const [start, setStart] = useState(plusDays(today(), 7));
  const [days, setDays] = useState(2);
  const [party, setParty] = useState<{
    size: number;
    kind: 'solo' | 'couple' | 'friends' | 'family';
  }>({ size: 2, kind: 'friends' });
  const [interests, setInterests] = useState<string[]>(['temples', 'food']);
  const [pace, setPace] = useState<Pace>('moderate');
  const [budget, setBudget] = useState<Budget>('mid');
  const [mustSee, setMustSee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const trip = await api.createTrip({
        destination: destination.trim(),
        start_date: start,
        end_date: plusDays(start, Math.max(0, days - 1)),
        party,
        interests,
        pace,
        budget,
        language: 'en',
      });
      onCreated(trip.id, mustSee.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const field =
    'mt-1.5 w-full rounded-xl border border-line bg-card px-4 py-2.5 outline-none focus:border-accent';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">Where to?</h2>
      <p className="mt-1 text-sm text-muted">
        Pins stream onto the map as each place is verified on OpenStreetMap.
      </p>
      <section className="mt-5 space-y-5">
        <label className="block">
          <span className="text-sm font-semibold">Destination</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={cx(field, 'text-lg font-medium')}
            placeholder="Kyoto · Lisbon · Pittsburgh, PA"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">First day</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={field}
            />
          </label>
          <div>
            <span className="text-sm font-semibold">Days</span>
            <div className="mt-1.5 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Chip key={n} active={days === n} onClick={() => setDays(n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className="text-sm font-semibold">Who</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(
              [
                ['solo', 1, 'Solo'],
                ['couple', 2, 'Couple'],
                ['friends', 3, 'Friends'],
                ['family', 4, 'Family'],
              ] as const
            ).map(([kind, size, label]) => (
              <Chip
                key={kind}
                active={party.kind === kind}
                onClick={() => setParty({ size, kind })}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-semibold">Interests</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip
                key={i}
                active={interests.includes(i)}
                onClick={() =>
                  setInterests((xs) => (xs.includes(i) ? xs.filter((x) => x !== i) : [...xs, i]))
                }
              >
                {i}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-semibold">Pace</span>
            <div className="mt-1.5 flex gap-2">
              {(['relaxed', 'moderate', 'packed'] as Pace[]).map((p) => (
                <Chip key={p} active={pace === p} onClick={() => setPace(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">Budget</span>
            <div className="mt-1.5 flex gap-2">
              {(['low', 'mid', 'high'] as Budget[]).map((b) => (
                <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                  {b === 'low' ? '$' : b === 'mid' ? '$$' : '$$$'}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-semibold">Must-see (optional)</span>
          <input
            value={mustSee}
            onChange={(e) => setMustSee(e.target.value)}
            className={field}
            placeholder="Fushimi Inari; a good ramen place"
          />
        </label>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <Button size="lg" onClick={() => void submit()} disabled={busy || !destination.trim()}>
          {busy ? 'Creating…' : 'Create trip & plan it'}
        </Button>
      </section>
    </div>
  );
}
