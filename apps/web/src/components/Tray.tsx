'use client';
import { useState } from 'react';
import { dayIndexOf, tripLengthDays, type Media, type TripBundle } from '@pinlog/schema';
import { api, fileUrl } from '@/lib/api';
import { clock, dayColor } from '@/lib/format';
import { Button, Panel, Sheet, cx } from './ui';

interface TrayProps {
  bundle: TripBundle;
  onChanged: () => void;
  onError: (e: unknown) => void;
  onSelectPin: (id: string) => void;
  /** panel = desktop left column (collapsible); sheet = phone bottom sheet with a close button. */
  variant?: 'panel' | 'sheet';
  onClose?: () => void;
}

/** MAP-5: photos without GPS or without a matching pin. Nothing is lost: move to a pin, or create a pin from the photo. */
export function Tray({
  bundle,
  onChanged,
  onError,
  onSelectPin,
  variant = 'panel',
  onClose,
}: TrayProps) {
  const items = bundle.media.filter((m) => !m.pin_id);
  const [open, setOpen] = useState(true);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (items.length === 0 && variant === 'panel') return null;

  const moveTo = async (m: Media, pin_id: string) => {
    setBusy(m.id);
    try {
      await api.updateMedia(m.id, { pin_id });
      setPicking(null);
      onChanged();
      onSelectPin(pin_id);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };
  const createPinHere = async (m: Media) => {
    if (m.lat === null || m.lng === null) return;
    const name = window.prompt('Name this place', 'New place');
    if (!name) return;
    setBusy(m.id);
    try {
      const len = tripLengthDays(bundle.trip.start_date, bundle.trip.end_date);
      const day = m.taken_at
        ? Math.min(Math.max(1, dayIndexOf(bundle.trip.start_date, m.taken_at)), Math.max(1, len))
        : 1;
      const pin = await api.createPin(bundle.trip.id, {
        name,
        lat: m.lat,
        lng: m.lng,
        day_index: day,
        kind: 'custom',
        source: 'photo',
        place_id: null,
        address: null,
        planned_start: null,
        planned_end: null,
        ai_reason: null,
      });
      await api.updateMedia(m.id, { pin_id: pin.id });
      onChanged();
      onSelectPin(pin.id);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(null);
    }
  };

  const pinsByDay = [...new Set(bundle.pins.map((p) => p.day_index))].sort((a, b) => a - b);
  const list = (
    <ul
      className={cx(
        'space-y-2 px-3 pb-3',
        variant === 'panel'
          ? 'max-h-[38vh] overflow-y-auto'
          : 'min-h-0 flex-1 overflow-y-auto pt-2',
      )}
    >
      {items.length === 0 && (
        <li className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
          Tray empty — every photo has a pin.
        </li>
      )}
      {items.map((m) => (
        <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex items-center gap-2.5">
            <img
              src={fileUrl(m.thumb_path)}
              alt=""
              className="h-14 w-14 rounded-lg bg-slate-200 object-cover"
            />
            <div className="min-w-0 flex-1 text-xs text-slate-600">
              <div className="truncate font-medium text-slate-800">
                {m.taken_at ? `${m.taken_at.slice(0, 10)} · ${clock(m.taken_at)}` : 'no timestamp'}
              </div>
              <div>
                {m.lat !== null
                  ? `GPS ${m.lat.toFixed(4)}, ${m.lng!.toFixed(4)} · no pin within 300 m`
                  : 'no GPS in the photo'}
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPicking(picking === m.id ? null : m.id)}
                  disabled={busy === m.id}
                >
                  Move to pin ▾
                </Button>
                {m.lat !== null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => createPinHere(m)}
                    disabled={busy === m.id}
                  >
                    Create pin here
                  </Button>
                )}
              </div>
            </div>
          </div>
          {picking === m.id && (
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-2">
              {pinsByDay.map((d) => (
                <div key={d}>
                  <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Day {d}
                  </div>
                  {bundle.pins
                    .filter((p) => p.day_index === d)
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-xs hover:bg-white"
                        onClick={() => moveTo(m, p.id)}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: dayColor(d) }}
                        />
                        {p.name}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  if (variant === 'sheet') {
    return (
      <Sheet desktopClass="md:w-[380px]">
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <div>
            <div className="text-xs text-slate-500">Nothing is lost</div>
            <h2 className="text-lg font-bold leading-tight">🗂️ Unsorted photos · {items.length}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {list}
      </Sheet>
    );
  }
  return (
    <Panel className={cx('w-[340px] overflow-hidden', !open && 'w-auto')}>
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        onClick={() => setOpen((o) => !o)}
      >
        <span>🗂️ Unsorted photos · {items.length}</span>
        <span className="text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && list}
    </Panel>
  );
}
