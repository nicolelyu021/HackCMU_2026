'use client';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayIndexOf, nowNaive, tripLengthDays, withinWindow, type PlanEvent } from '@pinlog/schema';
import { api } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import { useBundle, useFixtureQuery, useHealth, useToasts } from '@/lib/hooks';
import { tripStats } from '@/lib/tripStats';
import { DayChips } from '@/components/DayChips';
import { Dock, type DockKey } from '@/components/Dock';
import { JournalDrawer } from '@/components/JournalDrawer';
import { LandingHUD } from '@/components/LandingHUD';
import { NewTripForm } from '@/components/NewTripForm';
import { usePhotoUpload, type LandingResult } from '@/components/PhotoDrop';
import { PinSheet } from '@/components/PinSheet';
import { PlanTicker, type PlanState } from '@/components/PlanTicker';
import { ScrapbookSpread } from '@/components/scrapbook/ScrapbookSpread';
import { Tray } from '@/components/Tray';
import { Button, Spinner, Toasts } from '@/components/ui';
import { VlogStudio } from '@/components/vlog/VlogStudio';
import type { ProvisionalStop } from '@/components/map/TripMap';

const TripMap = dynamic(() => import('@/components/map/TripMap'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#e7efe8]" />,
});

type Panel = 'map' | 'journal' | 'tray' | 'vlog' | 'scrapbook' | 'new';

export default function TripPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const search = useSearchParams();
  const { bundle, refresh, error } = useBundle(id);
  const health = useHealth();
  const { toasts, push, pushError } = useToasts();
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('map');
  const [pulsePinId, setPulsePinId] = useState<string | null>(null);
  const [scrapPulse, setScrapPulse] = useState(false);
  const [landed, setLanded] = useState<LandingResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [provisional, setProvisional] = useState<ProvisionalStop[]>([]);
  const planStarted = useRef(false);
  const q = useFixtureQuery();

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

  const openPin = useCallback((pid: string | null) => {
    setSelectedPinId(pid);
    if (pid) setPanel('map');
  }, []);

  const startPlan = useCallback(
    async (must_see?: string) => {
      setPlan({ running: true, stage: 'drafting', events: [], dropped: [] });
      setProvisional([]);
      setSelectedDay('all');
      setSelectedPinId(null);
      setPanel('map');
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
              setTimeout(() => setPlan((s) => (s && !s.running ? null : s)), 6000);
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
    const plan1 = search.get('plan') === '1';
    const pin = search.get('pin');
    const p = search.get('panel');
    if (!plan1 && !pin && !p) return;
    if (plan1 && !planStarted.current) {
      planStarted.current = true;
      void startPlan(search.get('must_see') ?? undefined);
    }
    if (pin) openPin(pin);
    if (p === 'journal' || p === 'tray' || p === 'vlog' || p === 'scrapbook' || p === 'new') {
      setPanel(p);
      setSelectedPinId(null);
    }
    router.replace(`/trips/${id}${q}`);
  }, [search, startPlan, id, router, q, openPin]);

  const onLanded = useCallback(
    (results: LandingResult[]) => {
      setLanded((xs) => [...xs, ...results]);
      const hit = results.find((r) => r.pin);
      if (hit?.pin) {
        setPulsePinId(hit.pin.id);
        setTimeout(() => setPulsePinId(null), 3500);
      }
      setScrapPulse(true);
      setTimeout(() => setScrapPulse(false), 8000);
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

  const selectedPin = bundle?.pins.find((p) => p.id === selectedPinId) ?? null;
  const stats = bundle ? tripStats(bundle) : null;
  const deskTall = !!(selectedPin || panel !== 'map' || plan || error);
  const deskFraction = deskTall ? 0.62 : 0.3;
  const dockActive: DockKey =
    panel === 'journal'
      ? 'journal'
      : panel === 'vlog'
        ? 'vlog'
        : panel === 'scrapbook'
          ? 'scrapbook'
          : 'map';

  const onDock = (key: DockKey) => {
    if (key === 'shelf') return;
    setSelectedPinId(null);
    if (key === 'map') setPanel('map');
    else if (key === 'journal') setPanel('journal');
    else if (key === 'vlog') setPanel('vlog');
    else if (key === 'scrapbook') setPanel('scrapbook');
  };

  return (
    <main
      className="relative h-dvh w-screen overflow-hidden bg-paper"
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
          onSelectPin={openPin}
          pulsePinId={pulsePinId}
          nowPinId={nowPinId}
          provisional={provisional}
          deskFraction={deskFraction}
        />
      )}
      {uploader.input}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-paper/40">
          <div className="rounded-3xl border border-dashed border-line-strong bg-card px-10 py-8 text-center">
            <div className="font-display text-lg font-bold">Drop photos anywhere</div>
            <div className="mt-1 text-sm text-muted">EXIF is read here · 300 m · ±2 h</div>
          </div>
        </div>
      )}
      <LandingHUD results={landed} onSelectPin={openPin} />
      <Toasts toasts={toasts} />

      <div
        className="absolute inset-x-0 bottom-0 z-40 flex flex-col border-t border-line-strong bg-paper"
        style={{ height: deskTall ? '72dvh' : undefined, maxHeight: '72dvh' }}
      >
        {plan && (
          <div className="border-b border-line px-3 py-2">
            <PlanTicker state={plan} />
          </div>
        )}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {bundle && panel === 'map' && !selectedPin && !plan && (
          <div className="flex-none px-4 pb-2 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-lg font-extrabold leading-tight">
                  {bundle.trip.title}
                </div>
                <div className="text-[11px] text-muted">
                  {prettyDate(bundle.trip.start_date)} → {prettyDate(bundle.trip.end_date)}
                  {stats
                    ? ` · ${stats.pins} pins · ${stats.photos} photos · ${stats.notes} notes · ${stats.km} km`
                    : ''}
                </div>
              </div>
              <span className="rounded-full border border-line bg-card px-2 py-0.5 text-[10px] text-muted">
                {health?.mode === 'live' ? 'Live' : 'Demo'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              <DayChips
                trip={bundle.trip}
                selected={selectedDay}
                onSelect={setSelectedDay}
                todayIndex={todayIndex}
                nowrap
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bundle.pins.length === 0 && (
                <Button size="sm" onClick={() => startPlan()}>
                  Plan this trip
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={uploader.openPicker}
                disabled={!!uploader.uploading}
              >
                {uploader.uploading ? (
                  <>
                    <Spinner /> {uploader.uploading.done}/{uploader.uploading.total}
                  </>
                ) : (
                  'Add photos'
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPanel('scrapbook')}>
                Generate scrapbook
              </Button>
              {stats && stats.unsorted > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setPanel('tray')}>
                  Unsorted · {stats.unsorted}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {bundle && selectedPin && (
            <PinSheet
              bundle={bundle}
              pin={selectedPin}
              onClose={() => setSelectedPinId(null)}
              onChanged={refresh}
              onError={pushError}
            />
          )}
          {bundle && panel === 'journal' && !selectedPin && (
            <JournalDrawer
              bundle={bundle}
              todayIndex={todayIndex}
              onClose={() => setPanel('map')}
              onError={pushError}
            />
          )}
          {bundle && panel === 'tray' && !selectedPin && (
            <Tray
              variant="sheet"
              bundle={bundle}
              onChanged={refresh}
              onError={pushError}
              onSelectPin={openPin}
              onClose={() => setPanel('map')}
            />
          )}
          {bundle && panel === 'scrapbook' && !selectedPin && (
            <ScrapbookSpread bundle={bundle} onError={pushError} />
          )}
          {panel === 'vlog' && !selectedPin && <VlogStudio tripId={id} embedded bundle={bundle} />}
          {panel === 'new' && !selectedPin && (
            <NewTripForm
              onCreated={(tripId, mustSee) => {
                const params = new URLSearchParams({ plan: '1' });
                if (mustSee) params.set('must_see', mustSee);
                router.push(`/trips/${tripId}?${params}${q ? `&fixture=1` : ''}`);
              }}
            />
          )}
        </div>

        <Dock
          tripId={id}
          active={dockActive}
          onSelect={onDock}
          pulse={scrapPulse ? 'scrapbook' : null}
        />
      </div>
    </main>
  );
}
