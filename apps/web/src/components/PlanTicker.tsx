'use client';
import type { PlanEvent } from '@pinlog/schema';
import { Panel, Spinner } from './ui';

export interface PlanState {
  running: boolean;
  stage: string | null;
  detail?: string;
  events: PlanEvent[];
  error?: string | null;
  dropped: string[];
}

const STAGE_LABEL: Record<string, string> = {
  drafting: 'Claude is drafting the itinerary…',
  resolving: 'Verifying each place on OpenStreetMap…',
  ordering: 'Ordering the day…',
  saving: 'Saving pins…',
};

/** Signature moment 3: pins stream onto the map while the model writes. */
export function PlanTicker({ state }: { state: PlanState }) {
  const items = state.events.filter((e) => e.type === 'stop' || e.type === 'warning').slice(-6);
  const verified = state.events.filter((e) => e.type === 'stop').length;
  return (
    <Panel className="w-full p-3 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        {state.running ? <Spinner /> : <span>{state.error ? '⚠️' : '✅'}</span>}
        <span>
          {state.running
            ? (STAGE_LABEL[state.stage ?? ''] ?? 'Planning…')
            : state.error
              ? `Planning failed: ${state.error}`
              : `Plan ready · ${verified} verified pins${state.dropped.length ? ` · ${state.dropped.length} dropped` : ''}`}
        </span>
      </div>
      {state.detail && <div className="mt-0.5 text-xs text-muted">{state.detail}</div>}
      <ul className="mt-2 space-y-1.5">
        {items.map((e, i) =>
          e.type === 'stop' ? (
            <li key={i} className="flex gap-2 text-xs">
              <span className="text-accent">✓</span>
              <span>
                <span className="font-semibold">{e.stop.name}</span>{' '}
                <span className="text-muted">· day {e.day_index} · verified</span>
                <div className="text-muted">{e.stop.ai_reason}</div>
              </span>
            </li>
          ) : e.type === 'warning' ? (
            <li key={i} className="flex gap-2 text-xs text-muted">
              <span className="text-red-500">✕</span>
              <span>
                <span className="font-semibold line-through">{e.name}</span> · {e.reason}
              </span>
            </li>
          ) : null,
        )}
      </ul>
    </Panel>
  );
}
