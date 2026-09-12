'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayIndexOf, nowNaive, tripLengthDays, withinWindow, type PlanEvent } from '@pinlog/schema';
import { api } from '@/lib/api';
import { isFixtureMode } from '@/lib/config';
import { prettyDate } from '@/lib/format';
import { useBundle, useToasts } from '@/lib/hooks';
import { DayChips } from '@/components/DayChips';
import { JournalDrawer } from '@/components/JournalDrawer';
import { LandingHUD } from '@/components/LandingHUD';
import { usePhotoUpload, type LandingResult } from '@/components/PhotoDrop';
import { PinSheet } from '@/components/PinSheet';
import { PlanTicker, type PlanState } from '@/components/PlanTicker';
import { TopBar } from '@/components/TopBar';
import { Tray } from '@/components/Tray';
import { Button, Panel, Spinner, Toasts } from '@/components/ui';
import type { ProvisionalStop } from '@/components/map/TripMap';

const TripMap = dynamic(() => import('@/components/map/TripMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-slate-100" />,
});

/** MAP-1 map-first home. Everything hangs off this page: pins, photos, notes, Ask, journal chat, plan streaming. */
export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { bundle, refresh, error } = useBundle(id);
  const { toasts, push, pushError } = useToasts();
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [pulsePinId, setPulsePinId] = useState<string | null>(null);
  const [landed, setLanded] = useState<LandingResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [provisional, setProvisional] = useState<ProvisionalStop[]>([]);
  const [replanText, setReplanText] = useState('');
  const [replanning, setReplanning] = useState(false);
  const planStarted = useRef(false);
  const q = typeof window !== 'undefined' && isFixtureMode() ? '?fixture=1' : '';

  const now = nowNaive();
  const todayIndex = useMemo(() => {
    if (!bundle) return null;
    const d = dayIndexOf(bundle.trip.start_date, now);
    const len = tripLengthDays(bundle.trip.start_date, bundle.trip.end_date);
    return d >= 1 && d <= len ? d : null;
  }, [bundle, now]);
  const nowPinId = useMemo(
    () =>
      bundle?.pins.find(
        (p) =>
          p.planned_start && p.planned_end && withinWindow(now, p.planned_start, p.planned_end),
      )?.id ?? null,
    [bundle, now],
  );
  useEffect(() => {
    if (
      todayIndex &&
      selectedDay === 'all' &&
      bundle &&
      bundle.pins.length > 0 &&
      !planStarted.current
    )
      setSelectedDay(todayIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIndex, bundle?.trip.id]);

  const startPlan = useCallback(
    async (must_see?: string) => {
      setPlan({ running: true, stage: 'drafting', events: [], dropped: [] });
      setProvisional([]);
      setSelectedDay('all');
      try {
        await api.plan(
          id,
          must_see
            ? {
                must_see: must_see
                  .split(/[;,]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              }
            : {},
          (ev: PlanEvent) => {
            setPlan((s) =>
              s
                ? {
                    ...s,
                    events: [...s.events, ev],
                    stage: ev.type === 'status' ? ev.stage : s.stage,
                    detail: ev.type === 'status' ? ev.detail : s.detail,
                  }
                : s,
            );
            if (ev.type === 'stop')
              setProvisional((xs) => [...xs, { day_index: ev.day_index, stop: ev.stop }]);
            if (ev.type === 'done') {
              setPlan((s) => (s ? { ...s, running: false, dropped: ev.dropped } : s));
              setProvisional([]);
              void refresh();
              push({
                kind: 'success',
                title: `${ev.pins.length} pins verified on OpenStreetMap`,
                detail: ev.dropped.length
                  ? `Dropped (unverified): ${ev.dropped.join(', ')}`
                  : 'Every pin resolved.',
              });
            }
            if (ev.type === 'error')
              setPlan((s) => (s ? { ...s, running: false, error: ev.message } : s));
          },
        );
      } catch (e) {
        setPlan((s) =>
          s ? { ...s, running: false, error: e instanceof Error ? e.message : String(e) } : s,
        );
        pushError(e, 'Planning failed');
      }
    },
    [id, refresh, push, pushError],
  );
  useEffect(() => {
    if (search.get('plan') === '1' && !planStarted.current) {
      planStarted.current = true;
      void startPlan(search.get('must_see') ?? undefined);
      router.replace(`/trips/${id}`);
    }
  }, [search, startPlan, id, router]);

  const onLanded = useCallback(
    (results: LandingResult[]) => {
      setLanded((xs) => [...xs, ...results]);
      const hit = results.find((r) => r.pin);
      if (hit?.pin) {
        setPulsePinId(hit.pin.id);
        setTimeout(() => setPulsePinId(null), 3500);
      }
      setTimeout(() => setLanded((xs) => xs.filter((x) => !results.includes(x))), 7000);
      void refresh();
    },
    [refresh],
  );
  const uploader = usePhotoUpload({
    tripId: id,
    pins: bundle?.pins ?? [],
    onLanded,
    onError: (e) => pushError(e, 'Upload failed'),
    onDone: refresh,
  });

  const replan = async () => {
    if (!replanText.trim()) return;
    setReplanning(true);
    try {
      const res = await api.replan(id, replanText.trim());
      push({ kind: 'success', title: 'Plan updated', detail: res.diff.summary });
      setReplanText('');
      void refresh();
    } catch (e) {
      pushError(e, 'Replan refused');
    } finally {
      setReplanning(false);
    }
  };

  const selectedPin = bundle?.pins.find((p) => p.id === selectedPinId) ?? null;
  const onSelectPin = useCallback((pid: string | null) => {
    setSelectedPinId(pid);
    if (pid) setJournalOpen(false);
  }, []);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-slate-100"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) void uploader.upload(e.dataTransfer.files);
      }}
    >
      {bundle && (
        <TripMap
          bundle={bundle}
          selectedDay={selectedDay}
          selectedPinId={selectedPinId}
          onSelectPin={onSelectPin}
          pulsePinId={pulsePinId}
          nowPinId={nowPinId}
          provisional={provisional}
        />
      )}
      <TopBar
        title={bundle ? `${bundle.trip.title} · ${bundle.trip.destination}` : '…'}
        right={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setJournalOpen((o) => !o);
                setSelectedPinId(null);
              }}
            >
              💬 Talk to your journal
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={uploader.openPicker}
              disabled={!!uploader.uploading}
            >
              {uploader.uploading ? (
                <>
                  <Spinner /> {uploader.uploading.done}/{uploader.uploading.total}
                </>
              ) : (
                '📷 Add photos'
              )}
            </Button>
            <Link href={`/trips/${id}/vlog${q}`}>
              <Button variant="dark" size="sm">
                🎬 Make vlog
              </Button>
            </Link>
          </>
        }
      />
      {uploader.input}

      {/* left column */}
      <div className="pointer-events-none absolute left-4 top-16 z-30 flex max-h-[calc(100vh-5rem)] w-[340px] flex-col gap-3">
        {bundle && (
          <Panel className="pointer-events-auto p-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {prettyDate(bundle.trip.start_date)} → {prettyDate(bundle.trip.end_date)}
              </span>
              <span>
                {bundle.pins.length} pins · {bundle.media.length} photos · {bundle.entries.length}{' '}
                notes
              </span>
            </div>
            <div className="mt-2">
              <DayChips
                trip={bundle.trip}
                selected={selectedDay}
                onSelect={setSelectedDay}
                todayIndex={todayIndex}
              />
            </div>
            {bundle.pins.length === 0 && !plan?.running && (
              <div className="mt-3 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3 text-sm">
                <div className="font-semibold">No pins yet.</div>
                <Button className="mt-2" size="sm" onClick={() => startPlan()}>
                  ✨ Plan this trip with Claude
                </Button>
              </div>
            )}
            {bundle.pins.length > 0 && (
              <form
                className="mt-3 flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void replan();
                }}
              >
                <input
                  value={replanText}
                  onChange={(e) => setReplanText(e.target.value)}
                  placeholder="Change the plan… “make day 2 lighter”"
                  className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-orange-400"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  type="submit"
                  disabled={replanning || !replanText.trim()}
                >
                  {replanning ? <Spinner /> : 'Replan'}
                </Button>
              </form>
            )}
          </Panel>
        )}
        {plan && (
          <div className="pointer-events-auto">
            <PlanTicker state={plan} />
          </div>
        )}
        {error && (
          <Panel className="pointer-events-auto border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </Panel>
        )}
        <div className="pointer-events-auto mt-auto">
          {bundle && (
            <Tray
              bundle={bundle}
              onChanged={refresh}
              onError={pushError}
              onSelectPin={(pid) => onSelectPin(pid)}
            />
          )}
        </div>
      </div>

      {/* right column */}
      <div className="absolute right-4 top-16 z-30">
        {bundle && selectedPin && (
          <PinSheet
            bundle={bundle}
            pin={selectedPin}
            onClose={() => setSelectedPinId(null)}
            onChanged={refresh}
            onError={pushError}
          />
        )}
        {bundle && journalOpen && !selectedPin && (
          <JournalDrawer
            bundle={bundle}
            todayIndex={todayIndex}
            onClose={() => setJournalOpen(false)}
            onError={pushError}
          />
        )}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-orange-500/10 backdrop-blur-[1px]">
          <div className="rounded-3xl border-4 border-dashed border-orange-500 bg-white/90 px-10 py-8 text-center shadow-xl">
            <div className="text-4xl">📷</div>
            <div className="mt-2 text-lg font-bold">Drop photos anywhere</div>
            <div className="text-sm text-slate-600">
              EXIF is read here in the browser · 300 m · ±2 h · nothing is lost
            </div>
          </div>
        </div>
      )}
      <LandingHUD results={landed} onSelectPin={(pid) => onSelectPin(pid)} />
      <Toasts toasts={toasts} />
    </main>
  );
}
