'use client';
import React, { useEffect, useMemo, useRef } from 'react';
import MapGL, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import type { ItineraryStop, TripBundle } from '@pinlog/schema';
import { MAP_STYLE_URL } from '@/lib/config';
import { ensureMapLibreWorker } from '@/lib/maplibre';
import { dayColor } from '@/lib/format';
import { RouteSketch } from './RouteSketch';
import { cx } from '@/components/ui';

export interface ProvisionalStop {
  day_index: number;
  stop: ItineraryStop;
}

export interface TripMapProps {
  bundle: TripBundle;
  selectedDay: number | 'all';
  selectedPinId: string | null;
  onSelectPin: (id: string | null) => void;
  pulsePinId: string | null;
  nowPinId: string | null;
  /** Verified stops streaming in from the planner (dashed markers until `done`). */
  provisional: ProvisionalStop[];
  mapStyle?: string;
  /** Fraction of the map height covered by the paper desk (pins pad above it). */
  deskFraction?: number;
  sketch?: boolean;
  onUnavailable?: () => void;
}

const lineFor = (points: { lng: number; lat: number }[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: points.map((p) => [p.lng, p.lat]) },
});

// Must run before the first street map is created (docs/ARCHITECTURE.md gotcha 15): without it MapLibre's web worker
// 404s under Turbopack, no tiles ever load, and the 8 s check below always flips the page back to the sketch.
ensureMapLibreWorker();

/** MAP-1: pins, route per day, day filter, "now" marker. Client-only (MapLibre touches window). */
export function TripMap({
  bundle,
  selectedDay,
  selectedPinId,
  onSelectPin,
  pulsePinId,
  nowPinId,
  provisional,
  mapStyle,
  deskFraction = 0.3,
  sketch = false,
  onUnavailable,
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
  /** true once MapLibre fired `load` (style + first frame). Only a map that never gets there is "unavailable". */
  const loadedRef = useRef(false);
  const pins = useMemo(
    () =>
      [...bundle.pins]
        .filter((p) => selectedDay === 'all' || p.day_index === selectedDay)
        .sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index),
    [bundle.pins, selectedDay],
  );
  const photoCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of bundle.media) if (x.pin_id) m.set(x.pin_id, (m.get(x.pin_id) ?? 0) + 1);
    return m;
  }, [bundle.media]);
  const days = useMemo(
    () => [...new Set(pins.map((p) => p.day_index))].sort((a, b) => a - b),
    [pins],
  );

  const all = useMemo(
    () => [
      ...pins.map((p) => ({ lng: p.lng, lat: p.lat })),
      ...provisional.map((s) => ({ lng: s.stop.lng, lat: s.stop.lat })),
    ],
    [pins, provisional],
  );
  const center =
    bundle.trip.center_lng !== null && bundle.trip.center_lat !== null
      ? { lng: bundle.trip.center_lng, lat: bundle.trip.center_lat }
      : (all[0] ?? { lng: -79.9959, lat: 40.4406 });

  // fit to the visible pins whenever they change (new plan, day filter) and once the map has loaded
  const fitKey = all.map((p) => `${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join('|');
  const fit = () => {
    const map = mapRef.current;
    if (!map || all.length === 0) return;
    if (all.length === 1) {
      map.flyTo({ center: [all[0]!.lng, all[0]!.lat], zoom: 14, duration: 800 });
      return;
    }
    const lngs = all.map((p) => p.lng);
    const lats = all.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: {
          top: 42,
          left: 28,
          right: 28,
          bottom: Math.min(
            Math.round(map.getContainer().clientHeight * deskFraction) + 18,
            map.getContainer().clientHeight - 80,
          ),
        },
        duration: 900,
        maxZoom: 15.5,
      },
    );
  };
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, deskFraction]);

  useEffect(() => {
    const map = mapRef.current;
    const p = bundle.pins.find((x) => x.id === selectedPinId);
    if (!map || !p) return;
    map.easeTo({
      center: [p.lng, p.lat],
      zoom: Math.max(map.getZoom(), 14.5),
      duration: 600,
      padding: {
        right: 0,
        left: 0,
        top: 0,
        bottom: Math.round(map.getContainer().clientHeight * Math.max(deskFraction, 0.55)),
      },
    });
  }, [selectedPinId, bundle.pins, deskFraction]);

  // Fall back to the sketch only if the style never loads: `isStyleLoaded()` and rendered-feature counts are
  // momentarily false/empty while tiles stream in, which used to flip a working map back to the sketch at 8 s.
  useEffect(() => {
    if (sketch) return;
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current) onUnavailable?.();
    }, 8000);
    return () => clearTimeout(timer);
  }, [sketch, bundle.trip.id, onUnavailable]);

  if (sketch) {
    return (
      <RouteSketch
        pins={pins}
        onSelectPin={onSelectPin}
        selectedPinId={selectedPinId}
        deskFraction={deskFraction}
      />
    );
  }

  return (
    <>
      <div className="absolute inset-0" aria-hidden={sketch} inert={sketch}>
        <MapGL
          ref={mapRef}
          mapStyle={mapStyle ?? MAP_STYLE_URL}
          initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 12.5 }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          onClick={() => onSelectPin(null)}
          onLoad={() => {
            loadedRef.current = true;
            fit();
          }}
          // a single failed tile or sprite is not fatal; only a failure before `load` means "no street map"
          onError={(e) => {
            if (!loadedRef.current) {
              console.warn('[map] street map unavailable', e.error?.message ?? e);
              onUnavailable?.();
            }
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {days.map((d) => {
            const pts = pins.filter((p) => p.day_index === d);
            if (pts.length < 2) return null;
            return (
              <Source key={`route-${d}`} id={`route-${d}`} type="geojson" data={lineFor(pts)}>
                <Layer
                  id={`route-${d}-casing`}
                  type="line"
                  paint={{ 'line-color': '#fffcf5', 'line-width': 5, 'line-opacity': 0.8 }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
                <Layer
                  id={`route-${d}-line`}
                  type="line"
                  paint={{
                    'line-color': dayColor(d),
                    'line-width': 2.5,
                    'line-opacity': 0.9,
                    'line-dasharray': [2, 1.4],
                  }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </Source>
            );
          })}
          {provisional.length > 1 && (
            <Source
              id="route-provisional"
              type="geojson"
              data={lineFor(provisional.map((s) => s.stop))}
            >
              <Layer
                id="route-provisional-line"
                type="line"
                paint={{
                  'line-color': '#8b7cb8',
                  'line-width': 3,
                  'line-dasharray': [1.5, 1.5],
                  'line-opacity': 0.8,
                }}
              />
            </Source>
          )}
          {pins.map((p) => {
            const idx = pins.filter((x) => x.day_index === p.day_index).indexOf(p) + 1;
            const n = photoCount.get(p.id) ?? 0;
            const selected = p.id === selectedPinId;
            const isNow = p.id === nowPinId;
            return (
              <Marker
                key={p.id}
                longitude={p.lng}
                latitude={p.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onSelectPin(p.id);
                }}
              >
                <button
                  type="button"
                  className="group relative flex flex-col items-center"
                  title={p.name}
                  aria-label={`Open ${p.name}`}
                  aria-pressed={selected}
                >
                  <div
                    className={cx(
                      'map-marker relative flex items-center justify-center transition-transform',
                      selected ? 'selected scale-110' : 'group-hover:scale-110',
                      p.id === pulsePinId && 'pin-pulse',
                    )}
                    style={{
                      borderColor: dayColor(p.day_index),
                      boxShadow: isNow
                        ? `0 0 0 4px ${dayColor(p.day_index)}55, 0 6px 16px rgba(0,0,0,0.3)`
                        : undefined,
                    }}
                  >
                    {idx}
                    {n > 0 && <span className="marker-photo-count">{n}</span>}
                  </div>
                  <div className="h-2 w-px bg-line-strong" />
                  <div
                    className={cx(
                      'pointer-events-none absolute top-full mt-0.5 whitespace-nowrap rounded-md border border-line bg-card px-1.5 py-0.5 text-[11px] font-semibold',
                      selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    {p.name}
                  </div>
                  {isNow && (
                    <div className="absolute -top-6 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      now
                    </div>
                  )}
                </button>
              </Marker>
            );
          })}
          {provisional.map((s, i) => (
            <Marker key={`prov-${i}`} longitude={s.stop.lng} latitude={s.stop.lat} anchor="bottom">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-accent bg-card text-xs font-bold text-accent animate-bounce"
                title={s.stop.name}
              >
                {i + 1}
              </div>
            </Marker>
          ))}
        </MapGL>
      </div>
    </>
  );
}

export default TripMap;
