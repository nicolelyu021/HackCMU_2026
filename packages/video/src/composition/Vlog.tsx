import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COMPOSITION, segmentStartFrames, type VlogRenderProps } from '@pinlog/schema';
import { MapLayer } from './map/MapLayer';
import { Outro } from './segments/Outro';
import { PinScene } from './segments/PinScene';
import { TitleCard } from './segments/TitleCard';

/** The composition (id 'Vlog', 1080×1920 @ 30 fps). Props = VlogRenderProps (schema); the vlog is a pure function of them. */
export const VlogComposition: React.FC<VlogRenderProps> = (props) => {
  const { script, pins } = props;
  const starts = segmentStartFrames(script, COMPOSITION.fps);
  const pinName = (id: string) => pins.find((p) => p.id === id)?.name ?? '';
  return (
    <AbsoluteFill style={{ background: '#0b1220' }}>
      <MapLayer props={props} />
      {script.segments.map((seg, i) => {
        const from = starts[i]!;
        const durationInFrames = Math.max(1, Math.round(seg.duration_s * COMPOSITION.fps));
        return (
          <Sequence
            key={i}
            from={from}
            durationInFrames={durationInFrames}
            name={seg.type === 'pin' ? pinName(seg.pin_id) : seg.type}
          >
            {seg.type === 'title' ? (
              <TitleCard segment={seg} dates={script.trip.dates} />
            ) : seg.type === 'pin' ? (
              <PinScene
                segment={seg}
                media={props.media}
                files_base_url={props.files_base_url}
                pinName={pinName(seg.pin_id)}
                dayIndex={seg.day_index}
              />
            ) : (
              <Outro segment={seg} pins={pins} title={script.trip.title} />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
