'use client';
import React, { useEffect, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import {
  COMPOSITION,
  scriptDurationInFrames,
  segmentStartFrames,
  type VlogRenderProps,
} from '@pinlog/schema';
import { VlogComposition } from './composition/Vlog';

export interface VlogPlayerProps {
  props: VlogRenderProps;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  style?: React.CSSProperties;
  /** Fires when playback crosses into a new segment (index into script.segments). */
  onSegmentChange?: (segmentIndex: number) => void;
}

/** Client component wrapping @remotion/player. Import with next/dynamic({ ssr: false }). Never import @remotion/player in the web app directly. */
export function VlogPlayer({
  props,
  autoPlay = false,
  controls = true,
  loop = false,
  style,
  onSegmentChange,
}: VlogPlayerProps) {
  const ref = useRef<PlayerRef>(null);
  const durationInFrames = scriptDurationInFrames(props.script, COMPOSITION.fps);

  useEffect(() => {
    const player = ref.current;
    if (!player || !onSegmentChange) return;
    const starts = segmentStartFrames(props.script, COMPOSITION.fps);
    let last = -1;
    const onFrame = (e: { detail: { frame: number } }) => {
      let idx = 0;
      for (let i = 0; i < starts.length; i++) if (e.detail.frame >= starts[i]!) idx = i;
      if (idx !== last) {
        last = idx;
        onSegmentChange(idx);
      }
    };
    player.addEventListener('frameupdate', onFrame);
    onFrame({ detail: { frame: player.getCurrentFrame() } });
    return () => player.removeEventListener('frameupdate', onFrame);
  }, [props.script, onSegmentChange]);

  return (
    <Player
      ref={ref}
      component={VlogComposition}
      inputProps={props}
      durationInFrames={durationInFrames}
      fps={COMPOSITION.fps}
      compositionWidth={COMPOSITION.width}
      compositionHeight={COMPOSITION.height}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      clickToPlay
      style={{
        width: '100%',
        aspectRatio: '9 / 16',
        borderRadius: 24,
        overflow: 'hidden',
        background: '#0b1220',
        ...style,
      }}
      acknowledgeRemotionLicense
    />
  );
}
