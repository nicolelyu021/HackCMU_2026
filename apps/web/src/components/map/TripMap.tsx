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
import { dayColor, KIND_EMOJI } from '@/lib/format';
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
}

/** Phone layout: panels are bottom sheets, so the fit pads the bottom instead of the sides. */
const narrow = (map: MapRef) => map.getContainer().clientWidth < 768;

const lineFor = (points: { lng: number; lat: number }[]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: points.map((p) => [p.lng, p.lat]) },
});

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
}: TripMapProps) {
  const mapRef = useRef<MapRef>(null);
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
        padding: narrow(map)
          ? { top: 150, left: 24, right: 24, bottom: 230 }
          : { top: 120, left: 380, right: 420, bottom: 160 },
        duration: 900,
        maxZoom: 15.5,
      },
    );
  };
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    const p = bundle.pins.find((x) => x.id === selectedPinId);
    if (!map || !p) return;
    map.easeTo({
      center: [p.lng, p.lat],
      zoom: Math.max(map.getZoom(), 14.5),
      duration: 600,
      padding: narrow(map)
        ? { right: 0, left: 0, top: 0, bottom: Math.round(map.getContainer().clientHeight * 0.62) }
        : { right: 380, left: 0, top: 0, bottom: 0 },
    });
  }, [selectedPinId, bundle.pins]);

  return (
    <MapGL
      ref={mapRef}
      mapStyle={mapStyle ?? MAP_STYLE_URL}
      initialViewState={{ longitude: center.lng, latitude: center.lat, zoom: 12.5 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      onClick={() => onSelectPin(null)}
      onLoad={fit}
    >
      <NavigationControl position="bottom-right" showCompass={false} />
      {days.map((d) => {
        const pts = pins.filter((p) => p.day_index === d);
        if (pts.length < 2) return null;
        return (
          <Source key={`route-${d}`} id={`route-${d}`} type="geojson" data={lineFor(pts)}>
            <Layer
              id={`route-${d}-casing`}
              type="line"
              paint={{ 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            <Layer
              id={`route-${d}-line`}
              type="line"
              paint={{ 'line-color': dayColor(d), 'line-width': 4, 'line-opacity': 0.9 }}
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
              'line-color': '#f97316',
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
            <div className="group relative flex flex-col items-center" title={p.name}>
              <div
                className={cx(
                  'relative flex h-9 min-w-9 items-center justify-center rounded-full border-[3px] border-white px-1 text-sm font-bold text-white shadow-lg transition-transform',
                  selected ? 'scale-125' : 'group-hover:scale-110',
                  p.id === pulsePinId && 'pin-pulse',
                )}
                style={{
                  background: dayColor(p.day_index),
                  boxShadow: isNow
                    ? `0 0 0 4px ${dayColor(p.day_index)}55, 0 6px 16px rgba(0,0,0,0.3)`
                    : undefined,
                }}
              >
                {p.source === 'user' || p.source === 'photo' ? KIND_EMOJI[p.kind] : idx}
                {n > 0 && (
                  <span className="absolute -right-2 -top-2 rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white ring-2 ring-white">
                    {n}
                  </span>
                )}
              </div>
              <div className="h-2 w-0.5 bg-white/90" />
              <div
                className={cx(
                  'pointer-events-none absolute top-full mt-0.5 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow',
                  selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                {p.name}
              </div>
              {isNow && (
                <div className="absolute -top-6 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  now
                </div>
              )}
            </div>
          </Marker>
        );
      })}
      {provisional.map((s, i) => (
        <Marker key={`prov-${i}`} longitude={s.stop.lng} latitude={s.stop.lat} anchor="bottom">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-orange-500 bg-white/90 text-xs font-bold text-orange-600 shadow animate-bounce"
            title={s.stop.name}
          >
            {i + 1}
          </div>
        </Marker>
      ))}
    </MapGL>
  );
}

export default TripMap;
