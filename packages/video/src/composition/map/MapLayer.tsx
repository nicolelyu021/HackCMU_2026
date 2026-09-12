import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VlogRenderProps } from '@pinlog/schema';
import { segmentAtFrame } from '../timing';
import { MapLibreFlyover } from './MapLibreFlyover';
import { StaticRouteCard } from './StaticRouteCard';

/** The map behind everything: live MapLibre in the Player, deterministic SVG route card for renders. */
export const MapLayer: React.FC<{ props: VlogRenderProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (props.map_mode === 'maplibre') {
    return (
      <MapLibreFlyover script={props.script} pins={props.pins} styleUrl={props.map_style_url} />
    );
  }
  const { index } = segmentAtFrame(props.script, frame, fps);
  const seg = props.script.segments[index]!;
  const pinIds = props.pins.map((p) => p.id);
  const activeId = seg.type === 'pin' ? seg.pin_id : null;
  const reachedIndex = activeId
    ? pinIds.indexOf(activeId)
    : seg.type === 'outro'
      ? pinIds.length - 1
      : -1;
  const progress = pinIds.length > 1 ? Math.max(0, reachedIndex) / (pinIds.length - 1) : 1;
  return (
    <AbsoluteFill>
      <StaticRouteCard
        pins={props.pins}
        width={width}
        height={height}
        progress={progress}
        activePinId={activeId}
        showLabels={false}
      />
    </AbsoluteFill>
  );
};
