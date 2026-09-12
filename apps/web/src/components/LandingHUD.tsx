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
    <div className="pointer-events-none fixed bottom-[6.5rem] left-1/2 z-40 flex w-[min(460px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-2 md:bottom-6">
      {results.slice(-4).map((r) => (
        <Panel
          key={r.media_id}
          className="pointer-events-auto flex w-full items-center gap-3 p-2.5"
          onClick={() => r.pin && onSelectPin(r.pin.id)}
        >
          <img
            src={fileUrl(r.thumb_path)}
            alt=""
            className="h-12 w-12 rounded-lg object-cover bg-slate-200"
          />
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-semibold">
              {r.pin ? (
                <>
                  <span className="text-emerald-600">landed on</span> {r.pin.name}
                </>
              ) : (
                <>
                  <span className="text-amber-600">→ unsorted tray</span>
                </>
              )}
            </div>
            <div className="truncate text-xs text-slate-600">{r.reason}</div>
          </div>
          <span className="text-2xl">{r.pin ? '📍' : '🗂️'}</span>
        </Panel>
      ))}
    </div>
  );
}
