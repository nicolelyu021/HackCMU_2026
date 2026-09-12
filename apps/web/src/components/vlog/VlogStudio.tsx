'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildRenderProps,
  tripLengthDays,
  type MapMode,
  type Vlog,
  type VlogStatus,
  type Voice,
} from '@pinlog/schema';
import { api, fileUrl } from '@/lib/api';
import { FILES_BASE_URL, MAP_STYLE_URL, isFixtureMode } from '@/lib/config';
import { MOOD_EMOJI } from '@/lib/format';
import { useBundle, useHealth, useToasts } from '@/lib/hooks';
import { TabBar } from '@/components/TabBar';
import { TopBar } from '@/components/TopBar';
import { Button, Chip, Panel, Spinner, Toasts, cx } from '@/components/ui';

// The Player (Remotion + MapLibre) touches window: client-only, never imported statically (docs/ARCHITECTURE.md gotcha 1-2).
const VlogPlayer = dynamic(() => import('@pinlog/video').then((m) => m.VlogPlayer), {
  ssr: false,
  loading: () => <div className="aspect-[9/16] w-full animate-pulse rounded-[2rem] bg-slate-800" />,
});

const STEPS: { status: VlogStatus; label: string; hint: string }[] = [
  { status: 'queued', label: 'Queued', hint: 'starting the job' },
  {
    status: 'scripting',
    label: 'Writing the script',
    hint: 'narration grounded only in your notes and captions',
  },
  { status: 'tts', label: 'Recording the voice', hint: 'one WAV per pin, durations measured' },
  { status: 'done', label: 'Ready', hint: 'plays in the browser' },
];
const VOICES: { id: Voice; label: string }[] = [
  { id: 'warm_female', label: 'Warm' },
  { id: 'calm_male', label: 'Calm' },
  { id: 'bright_female', label: 'Bright' },
];

/** VLOG-1/2/3/5: one-tap generate → stepper → Player, "from your note" pill, regenerate with instructions. */
export function VlogStudio({ tripId }: { tripId: string }) {
  const { bundle, error } = useBundle(tripId);
  const health = useHealth();
  const { toasts, push, pushError } = useToasts();
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [targetLength, setTargetLength] = useState(60);
  const [voice, setVoice] = useState<Voice>('warm_female');
  const [days, setDays] = useState<number[] | undefined>(undefined);
  const [mapMode, setMapMode] = useState<MapMode>('maplibre');
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [instructions, setInstructions] = useState('');
  const q = typeof window !== 'undefined' && isFixtureMode() ? '?fixture=1' : '';

  const loadVlogs = useCallback(() => api.listVlogs(tripId), [tripId]);
  useEffect(() => {
    loadVlogs()
      .then((list) => {
        setVlogs(list);
        const done = list.find((v) => v.status === 'done' && v.script);
        setActiveId((cur) => cur ?? done?.id ?? null);
        const running = list.find((v) => !['done', 'failed'].includes(v.status));
        if (running) setJobId(running.id);
      })
      .catch(pushError);
  }, [loadVlogs, pushError]);

  // poll the running job every 1.5 s (docs/CONTRACTS.md)
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const v = await api.getVlog(jobId);
        if (!alive) return;
        setVlogs((xs) => [v, ...xs.filter((x) => x.id !== v.id)]);
        if (v.status === 'done') {
          setActiveId(v.id);
          setSegmentIndex(0);
          setJobId(null);
          push({
            kind: 'success',
            title: 'Your vlog is ready',
            detail: `${v.duration_s ?? '?'} s · ${v.script?.segments.filter((s) => s.type === 'pin').length ?? 0} pins`,
          });
        } else if (v.status === 'failed') {
          setJobId(null);
          push({
            kind: 'error',
            title: 'Vlog failed — showing the last finished one',
            detail: v.error ?? undefined,
          });
        } else timer = setTimeout(tick, 1500);
      } catch (e) {
        if (alive) {
          pushError(e);
          setJobId(null);
        }
      }
    };
    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, push, pushError]);

  const make = async () => {
    try {
      const v = await api.createVlog(tripId, {
        target_length_s: targetLength,
        voice,
        ...(days ? { day_indexes: days } : {}),
      });
      setVlogs((xs) => [v, ...xs]);
      setJobId(v.id);
    } catch (e) {
      pushError(e, 'Could not start the vlog');
    }
  };
  const active = vlogs.find((v) => v.id === activeId) ?? null;
  const running = jobId ? (vlogs.find((v) => v.id === jobId) ?? null) : null;
  const regenerate = async () => {
    if (!active || !instructions.trim()) return;
    try {
      const v = await api.regenerateVlog(active.id, instructions.trim());
      setInstructions('');
      setVlogs((xs) => [v, ...xs]);
      setJobId(v.id);
    } catch (e) {
      pushError(e, 'Could not regenerate');
    }
  };

  const renderProps = useMemo(() => {
    if (!active?.script || !bundle) return null;
    return buildRenderProps(active.script, bundle, {
      files_base_url: health?.files_base_url || FILES_BASE_URL,
      map_style_url: health?.map_style_url || MAP_STYLE_URL,
      map_mode: mapMode,
    });
  }, [active, bundle, health, mapMode]);
  const seg = active?.script?.segments[segmentIndex];
  const sourceNotes = useMemo(
    () =>
      seg?.type === 'pin'
        ? (seg.source_entry_ids ?? [])
            .map((eid) => bundle?.entries.find((e) => e.id === eid))
            .filter((e): e is NonNullable<typeof e> => !!e)
        : [],
    [seg, bundle],
  );
  const pinName = (pid: string) => bundle?.pins.find((p) => p.id === pid)?.name ?? pid;
  const nDays = bundle
    ? Math.max(1, tripLengthDays(bundle.trip.start_date, bundle.trip.end_date))
    : 1;
  const stepIdx = running ? STEPS.findIndex((s) => s.status === running.status) : -1;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar
        title={bundle ? `${bundle.trip.title} · vlog studio` : 'Vlog studio'}
        right={
          <Link href={`/trips/${tripId}${q}`}>
            <Button variant="ghost" size="sm">
              ← Back to the map
            </Button>
          </Link>
        }
      />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-28 pt-20 md:px-6 md:pb-16 md:pt-24 grid-cols-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        {/* left: settings + stepper + history */}
        <div className="order-2 min-w-0 space-y-4 lg:order-1">
          <Panel dark className="p-4">
            <h2 className="text-lg font-bold">One-tap vlog</h2>
            <p className="mt-1 text-xs text-slate-400">
              The video is a pure function of your pins, photos and notes. Narration only says what
              your notes say.
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Target length</span>
                <span className="font-semibold text-slate-200">{targetLength} s</span>
              </div>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={targetLength}
                onChange={(e) => setTargetLength(Number(e.target.value))}
                className="mt-1 w-full accent-orange-500"
              />
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400">Voice</div>
              <div className="mt-1 flex gap-1.5">
                {VOICES.map((v) => (
                  <Chip dark key={v.id} active={voice === v.id} onClick={() => setVoice(v.id)}>
                    {v.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-400">Days</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Chip dark active={!days} onClick={() => setDays(undefined)}>
                  Whole trip
                </Chip>
                {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => (
                  <Chip
                    dark
                    key={d}
                    active={days?.includes(d) ?? false}
                    onClick={() =>
                      setDays((xs) =>
                        xs?.includes(d)
                          ? xs.length === 1
                            ? undefined
                            : xs.filter((x) => x !== d)
                          : [...(xs ?? []), d].sort(),
                      )
                    }
                  >
                    Day {d}
                  </Chip>
                ))}
              </div>
            </div>
            <Button
              size="lg"
              className="mt-5 w-full justify-center"
              onClick={make}
              disabled={!!jobId || !bundle || bundle.pins.length === 0}
            >
              {jobId ? (
                <>
                  <Spinner className="border-white" /> Making your vlog…
                </>
              ) : (
                '🎬 Make vlog'
              )}
            </Button>
            {bundle && bundle.pins.length === 0 && (
              <div className="mt-2 text-xs text-amber-300">
                Plan the trip first — a vlog needs pins.
              </div>
            )}
          </Panel>

          {(running || (active && active.id === vlogs[0]?.id && active.status === 'failed')) && (
            <Panel dark className="p-4">
              <ol className="space-y-2">
                {STEPS.map((s, i) => {
                  const state = running
                    ? i < stepIdx
                      ? 'done'
                      : i === stepIdx
                        ? 'now'
                        : 'todo'
                    : 'todo';
                  return (
                    <li key={s.status} className="flex items-start gap-2.5 text-sm">
                      <span
                        className={cx(
                          'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                          state === 'done'
                            ? 'bg-emerald-500 text-white'
                            : state === 'now'
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-700 text-slate-300',
                        )}
                      >
                        {state === 'done' ? (
                          '✓'
                        ) : state === 'now' ? (
                          <Spinner className="border-white h-3 w-3" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span>
                        <div className={cx('font-medium', state === 'todo' && 'text-slate-400')}>
                          {s.label}
                        </div>
                        {state === 'now' && <div className="text-xs text-slate-400">{s.hint}</div>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}

          {vlogs.length > 0 && (
            <Panel dark className="p-3">
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Vlogs of this trip
              </div>
              <ul className="mt-1 space-y-1">
                {vlogs.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => v.status === 'done' && (setActiveId(v.id), setSegmentIndex(0))}
                    >
                      <span className="truncate">
                        {new Date(v.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {v.settings.target_length_s} s
                        {v.settings.instructions ? ` · “${v.settings.instructions}”` : ''}
                      </span>
                      <span
                        className={cx(
                          'ml-2 rounded-full px-1.5 py-0.5 text-[10px]',
                          v.status === 'done'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : v.status === 'failed'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-slate-700 text-slate-200',
                        )}
                      >
                        {v.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* centre: phone */}
        <div className="order-1 flex min-w-0 flex-col items-center lg:order-2">
          <div className="w-[360px] max-w-full rounded-[2.6rem] border-[10px] border-slate-800 bg-black p-1 shadow-2xl">
            {renderProps ? (
              <VlogPlayer
                key={`${active?.id}-${mapMode}`}
                props={renderProps}
                controls
                autoPlay={false}
                onSegmentChange={setSegmentIndex}
                style={{ borderRadius: 32 }}
              />
            ) : (
              <div className="flex aspect-[9/16] w-full flex-col items-center justify-center rounded-[2rem] bg-slate-900 p-8 text-center text-slate-400">
                <div className="text-5xl">🎬</div>
                <div className="mt-3 text-sm">
                  {error ??
                    (vlogs.length
                      ? 'Pick a finished vlog or make a new one.'
                      : 'No vlog yet — press Make vlog.')}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>Map:</span>
            <Chip dark active={mapMode === 'maplibre'} onClick={() => setMapMode('maplibre')}>
              Live flyover
            </Chip>
            <Chip dark active={mapMode === 'static'} onClick={() => setMapMode('static')}>
              Static route
            </Chip>
            {active?.video_path && (
              <a className="ml-2 underline" href={fileUrl(active.video_path)} download>
                Download MP4
              </a>
            )}
          </div>
          {active && !active.video_path && (
            <div className="mt-1 text-[11px] text-slate-500">
              MP4 export (stretch): <code>pnpm render -- --vlog {active.id}</code>
            </div>
          )}
        </div>

        {/* right: current segment + script */}
        <div className="order-3 min-w-0 space-y-4">
          {seg && (
            <Panel dark className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Now playing · segment {segmentIndex + 1}/{active?.script?.segments.length}
              </div>
              {seg.type === 'pin' ? (
                <>
                  <div className="mt-1 text-lg font-bold">{seg.caption || pinName(seg.pin_id)}</div>
                  <p className="mt-2 text-sm text-slate-200">
                    {seg.narration || <span className="text-slate-500">(no narration)</span>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {seg.photos.length} photo{seg.photos.length === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {seg.duration_s.toFixed(1)} s
                    </span>
                    {seg.mood && (
                      <span className="rounded-full bg-slate-800 px-2 py-0.5">
                        {MOOD_EMOJI[seg.mood as keyof typeof MOOD_EMOJI] ?? seg.mood}
                      </span>
                    )}
                  </div>
                  {sourceNotes.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">
                        From your note
                      </div>
                      {sourceNotes.map((e) => (
                        <p key={e.id} className="mt-1 text-sm text-orange-100">
                          “{e.text}”
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
                      Narration built from photo captions only — no note on this pin yet.
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-1 text-lg font-bold">
                  {seg.type === 'title' ? seg.text : seg.text}
                </div>
              )}
            </Panel>
          )}

          {active?.script && (
            <Panel dark className="p-3">
              <div className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Script
              </div>
              <ol className="mt-1 space-y-1">
                {active.script.segments.map((s, i) => (
                  <li
                    key={i}
                    className={cx(
                      'rounded-lg px-2 py-1.5 text-xs',
                      i === segmentIndex ? 'bg-orange-500/20' : '',
                    )}
                  >
                    <span className="font-semibold">
                      {s.type === 'pin'
                        ? pinName(s.pin_id)
                        : s.type === 'title'
                          ? `Title · ${s.text}`
                          : `Outro · ${s.text}`}
                    </span>
                    {s.type === 'pin' && <div className="text-slate-300">{s.narration}</div>}
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {active && (
            <Panel dark className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Regenerate with instructions
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void regenerate();
                }}
              >
                <input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="more chill · skip day 1 · shorter"
                  className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-orange-400"
                />
                <Button type="submit" disabled={!!jobId || !instructions.trim()}>
                  Go
                </Button>
              </form>
            </Panel>
          )}
        </div>
      </div>
      <TabBar tripId={tripId} active="vlog" />
      <Toasts toasts={toasts} />
    </main>
  );
}
