'use client';
import { fileUrl } from '@/lib/api';
import type { LandingResult } from './PhotoDrop';
import { Panel } from './ui';

/** Signature moment 1: makes the EXIF math visible — distance, window, pin name; or "→ tray". */
export function LandingHUD({
  results,
  onSelectPin,
}: {
  results: LandingResult[];
  onSelectPin: (id: string) => void;
}) {
  if (results.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[11.5rem] z-40 flex flex-col items-center gap-2 px-3">
      {results.slice(-4).map((r) => (
        <Panel
          key={r.media_id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 p-2.5"
          onClick={() => r.pin && onSelectPin(r.pin.id)}
        >
          <img
            src={fileUrl(r.thumb_path)}
            alt=""
            className="h-12 w-12 rounded-lg bg-paper object-cover"
          />
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-semibold">
              {r.pin ? (
                <>
                  <span className="text-accent">landed on</span> {r.pin.name}
                </>
              ) : (
                <span className="text-muted">→ unsorted tray</span>
              )}
            </div>
            <div className="truncate text-xs text-muted">{r.reason}</div>
          </div>
        </Panel>
      ))}
    </div>
  );
}
