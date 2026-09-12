import React from 'react';
import type { VlogRenderProps } from '@pinlog/schema';
import { MapLibreFlyover } from './MapLibreFlyover';
import { StaticMapLayer } from './StaticMapLayer';

/** The map behind everything: live MapLibre in the Player (with a static fallback), deterministic SVG route card for renders. */
export const MapLayer: React.FC<{ props: VlogRenderProps }> = ({ props }) =>
  props.map_mode === 'maplibre' ? (
    <MapLibreFlyover script={props.script} pins={props.pins} styleUrl={props.map_style_url} />
  ) : (
    <StaticMapLayer script={props.script} pins={props.pins} />
  );
