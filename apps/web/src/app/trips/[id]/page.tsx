'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArtIcon, PencilArrow } from '@/components/ArtIcon';
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
import { UserChip } from '@/components/UserChip';
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
  // Demo starts with the local drawing, without waiting on tile providers or WebGL.
  const [sketch, setSketch] = useState(true);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const onMapUnavailable = useCallback(() => {
    setMapUnavailable(true);
    setSketch(true);
  }, []);
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
  const deskRef = useRef<HTMLDivElement>(null);
  const [deskFraction, setDeskFraction] = useState(0.4);
  useEffect(() => {
    const desk = deskRef.current;
    const workspace = desk?.parentElement;
    if (!desk || !workspace) return;
    const measure = () => setDeskFraction(desk.offsetHeight / Math.max(workspace.clientHeight, 1));
    const observer = new ResizeObserver(measure);
    observer.observe(desk);
    observer.observe(workspace);
    measure();
    return () => observer.disconnect();
  }, []);
  const visiblePins = useMemo(
    () =>
      [...(bundle?.pins ?? [])]
        .filter((pin) => selectedDay === 'all' || pin.day_index === selectedDay)
        .sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index),
    [bundle?.pins, selectedDay],
  );
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
      className="trip-room"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) void uploader.upload(e.dataTransfer.files);
      }}
    >
      <header className="room-header">
        <Link href={`/${q}`} className="brand" aria-label="Pinlog travel shelf">
          <ArtIcon name="clover" size={38} />
          <span>pinlog.</span>
        </Link>
        <div className="room-title">
          <span>{bundle?.trip.title ?? 'Opening your notebook…'}</span>
          <small>a notebook in the making</small>
        </div>
        <div className="shelf-header-right">
          <UserChip />
          <span className="demo-stamp">
            {health?.mode === 'live' ? 'on the road' : 'demo notebook'}
          </span>
        </div>
      </header>
      <div className="map-workspace">
        <div className="map-paper">
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
              sketch={sketch}
              onUnavailable={onMapUnavailable}
            />
          )}
          {!bundle && !error && (
            <div className="p-8 text-center font-display text-2xl">Unfolding your map…</div>
          )}
        </div>
        {uploader.input}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-paper/70">
            <div className="paper-panel border border-dashed border-line-strong bg-card px-10 py-8 text-center">
              <ArtIcon name="photos" size={88} />
              <div className="font-display text-3xl">A few more memories</div>
              <p className="mt-2 text-sm text-muted">Drop your photos. We'll find their place.</p>
            </div>
          </div>
        )}
        <LandingHUD results={landed} onSelectPin={openPin} />
        <Toasts toasts={toasts} />
        <div ref={deskRef} className={`map-desk ${deskTall ? 'is-open' : ''}`}>
          <div className="desk-handle" aria-hidden="true" />
          {deskTall && (
            <div className="desk-return">
              <span>
                {selectedPin
                  ? 'A place in your story'
                  : panel === 'scrapbook'
                    ? 'The memories so far'
                    : panel === 'journal'
                      ? 'A little conversation'
                      : panel === 'vlog'
                        ? 'Your trip, in motion'
                        : panel === 'tray'
                          ? 'The photo pocket'
                          : 'Your travel notebook'}
              </span>
              <button
                onClick={() => {
                  setPanel('map');
                  setSelectedPinId(null);
                }}
              >
                <PencilArrow back />
                Back to map
              </button>
            </div>
          )}
          {plan && (
            <div className="border-b border-line px-3 py-2">
              <PlanTicker state={plan} />
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
              {error}
            </div>
          )}
          {bundle && panel === 'map' && !selectedPin && !plan && (
            <div className="desk-overview">
              <div className="desk-heading">
                <div>
                  <h1>
                    {selectedDay === 'all'
                      ? 'A little wandering'
                      : `Day ${selectedDay}, a little wandering`}
                  </h1>
                  <p>
                    {prettyDate(bundle.trip.start_date)} — {prettyDate(bundle.trip.end_date)}
                    {stats ? ` · ${stats.photos} photos tucked away` : ''}
                  </p>
                </div>
                <ArtIcon name="map" size={61} />
              </div>
              {mapUnavailable && (
                <p className="mt-2 text-[11px] text-muted" role="status">
                  Street tiles are unavailable. Your places are still here in a route sketch.
                </p>
              )}
              <div className="desk-toolbar">
                <div className="desk-days">
                  <DayChips
                    trip={bundle.trip}
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    todayIndex={todayIndex}
                    nowrap
                  />
                </div>
                <div className="desk-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSketch(!sketch);
                      setMapUnavailable(false);
                    }}
                  >
                    {sketch ? 'Street map' : 'Route sketch'}
                  </Button>
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
                      <>
                        <ArtIcon name="camera" size={26} />
                        Add photos
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPanel('scrapbook')}>
                    <ArtIcon name="scrapbook" size={26} />
                    Scrapbook
                  </Button>
                  {stats && stats.unsorted > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setPanel('tray')}>
                      <ArtIcon name="photos" size={26} />
                      Unsorted · {stats.unsorted}
                    </Button>
                  )}
                </div>
              </div>
              {visiblePins.length > 0 && (
                <div className="pin-list" aria-label="Places on this day">
                  {visiblePins.map((pin, i) => (
                    <button key={pin.id} onClick={() => openPin(pin.id)}>
                      <span className="stop-number">{i + 1}</span>
                      <span>{pin.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="desk-pages">
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
            {panel === 'vlog' && !selectedPin && (
              <VlogStudio tripId={id} embedded bundle={bundle} />
            )}
            {panel === 'new' && !selectedPin && (
              <NewTripForm
                onCreated={(tripId, mustSee) => {
                  const params = new URLSearchParams({ plan: '1' });
                  if (mustSee) params.set('must_see', mustSee);
                  router.push(`/trips/${tripId}?${params}${q ? '&fixture=1' : ''}`);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <Dock
        tripId={id}
        active={dockActive}
        onSelect={onDock}
        pulse={scrapPulse ? 'scrapbook' : null}
      />
    </main>
  );
}
