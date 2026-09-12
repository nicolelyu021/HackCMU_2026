import React, { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  getRemotionEnvironment,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Camera, RenderPin, VlogScript } from '@pinlog/schema';
import { cameraAtFrame } from './camera';

// One persistent MapLibre map for the whole video; the camera is a pure function of the frame (jumpTo, never flyTo).
// Gotcha 3 in docs/ARCHITECTURE.md: interactive:false, fadeDuration:0, delayRender until idle only while rendering.

const MAP_CSS = `
.maplibregl-map{position:relative;overflow:hidden;width:100%;height:100%;font:12px/20px sans-serif}
.maplibregl-canvas{position:absolute;left:0;top:0}
.maplibregl-canvas-container{width:100%;height:100%}
.maplibregl-control-container{display:none}
`;

export interface MapLibreFlyoverProps {
  script: VlogScript;
  pins: RenderPin[];
  styleUrl: string;
}

export const MapLibreFlyover: React.FC<MapLibreFlyoverProps> = ({ script, pins, styleUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [ready, setReady] = useState(false);
  const camera: Camera = cameraAtFrame(script, pins, frame, fps);
  const isRendering = getRemotionEnvironment().isRendering;

  useEffect(() => {
    let cancelled = false;
    let map: import('maplibre-gl').Map | null = null;
    const handle = delayRender('maplibre style load');
    import('maplibre-gl').then((maplibregl) => {
      if (cancelled || !container.current) return continueRender(handle);
      const m = new maplibregl.Map({
        container: container.current,
        style: styleUrl,
        center: [camera.lng, camera.lat],
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
        interactive: false,
        fadeDuration: 0,
        attributionControl: false,
        canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true },
        maxPitch: 85,
      });
      map = m;
      mapRef.current = m;
      const done = () => {
        setReady(true);
        continueRender(handle);
      };
      m.once('load', done);
      m.once('error', (e) => {
        console.warn('[vlog] maplibre error', e.error?.message);
        done();
      });
    });
    return () => {
      cancelled = true;
      continueRender(handle);
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.jumpTo({
      center: [camera.lng, camera.lat],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    });
    if (!isRendering) return;
    const handle = delayRender(`map idle f${frame}`);
    const t = setTimeout(() => continueRender(handle), 4000);
    map.once('idle', () => {
      clearTimeout(t);
      continueRender(handle);
    });
    return () => clearTimeout(t);
  }, [
    camera.lng,
    camera.lat,
    camera.zoom,
    camera.pitch,
    camera.bearing,
    ready,
    isRendering,
    frame,
  ]);

  return (
    <AbsoluteFill style={{ background: '#0b1220' }}>
      <style>{MAP_CSS}</style>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </AbsoluteFill>
  );
};
