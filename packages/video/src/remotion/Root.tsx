import React from 'react';
import { Composition, staticFile } from 'remotion';
import {
  COMPOSITION,
  buildRenderProps,
  scriptDurationInFrames,
  type VlogRenderProps,
} from '@pinlog/schema';
import { demoBundle, demoScript } from '@pinlog/schema/fixtures';
import { VlogComposition } from '../composition/Vlog';

/**
 * Remotion Studio root (pnpm studio). Default props = the fixture vlog with files served from publicDir (data/files, run
 * `pnpm seed` first). The render CLI passes real props (from the API) as inputProps instead.
 */
const publicBase = staticFile('x').replace(/x$/, '');
const defaultProps: VlogRenderProps = buildRenderProps(demoScript(), demoBundle(), {
  files_base_url: publicBase,
  map_style_url: 'https://tiles.openfreemap.org/styles/liberty',
  map_mode: 'static',
  media_url: (m) => staticFile(m.storage_path),
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION.id}
    component={VlogComposition}
    durationInFrames={scriptDurationInFrames(defaultProps.script)}
    fps={COMPOSITION.fps}
    width={COMPOSITION.width}
    height={COMPOSITION.height}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({ durationInFrames: scriptDurationInFrames(props.script) })}
  />
);
