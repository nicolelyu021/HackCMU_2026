'use client';
import { dateForDay, tripLengthDays, type Trip } from '@pinlog/schema';
import { dayColor, prettyDate } from '@/lib/format';
import { Chip } from './ui';

export function DayChips({
  trip,
  selected,
  onSelect,
  todayIndex,
  nowrap = false,
}: {
  trip: Trip;
  selected: number | 'all';
  onSelect: (d: number | 'all') => void;
  todayIndex: number | null;
  /** Phone strip: one scrolling row instead of wrapping. */
  nowrap?: boolean;
}) {
  const n = Math.max(1, tripLengthDays(trip.start_date, trip.end_date));
  return (
    <div className={nowrap ? 'flex flex-nowrap gap-1.5' : 'flex flex-wrap gap-1.5'}>
      <Chip active={selected === 'all'} onClick={() => onSelect('all')} className="flex-none">
        All days
      </Chip>
      {Array.from({ length: n }, (_, i) => i + 1).map((d) => (
        <Chip
          key={d}
          active={selected === d}
          onClick={() => onSelect(d)}
          className="flex flex-none items-center gap-1.5"
        >
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dayColor(d) }} />
          Day {d} · {d === todayIndex ? 'today' : prettyDate(dateForDay(trip.start_date, d))}
        </Chip>
      ))}
    </div>
  );
}
