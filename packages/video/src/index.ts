// Owner D — public surface of @pinlog/video (browser-safe: no Node imports here; the render CLI is a separate entry).
import type { CSSProperties } from 'react';
import type { VlogRenderProps } from '@pinlog/schema';

export interface VlogPlayerProps {
  props: VlogRenderProps;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  style?: CSSProperties;
  /** Fires when playback crosses into a new segment (index into script.segments). */
  onSegmentChange?: (segmentIndex: number) => void;
}

/** Client component wrapping @remotion/player. Import with next/dynamic({ ssr: false }). */
export function VlogPlayer(_props: VlogPlayerProps): null {
  throw new Error('TODO(D): VlogPlayer not implemented');
}
