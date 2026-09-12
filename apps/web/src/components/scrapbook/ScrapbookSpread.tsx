'use client';
import { ArtIcon } from '@/components/ArtIcon';
import { useEffect, useMemo, useState } from 'react';
import type { Message, TripBundle } from '@pinlog/schema';
import { api, fileUrl } from '@/lib/api';
import { prettyDate } from '@/lib/format';
import {
  assembleScrapbook,
  emptyEdits,
  loadEdits,
  saveEdits,
  type ScrapEdits,
  type ScrapItem,
} from '@/lib/scrapbook';
import { projectPins } from '@/lib/tripStats';
import { Button, Spinner, cx } from '@/components/ui';

/** Compact field notebook: what the AI already logged, plus your cuts. */
export function ScrapbookSpread({
  bundle,
  onError,
}: {
  bundle: TripBundle;
  onError: (e: unknown) => void;
}) {
  const tripId = bundle.trip.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [edits, setEdits] = useState<ScrapEdits>(emptyEdits);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEdits(loadEdits(tripId));
    api.tripMessages(tripId).then(setMessages, onError);
  }, [tripId, onError]);

  const raw = useMemo(() => assembleScrapbook(bundle, messages), [bundle, messages]);
  const excludedCount = edits.excluded.length;

  const commit = (next: ScrapEdits) => {
    setEdits(next);
    saveEdits(tripId, next);
  };
  const toggle = (id: string) => {
    const excluded = edits.excluded.includes(id)
      ? edits.excluded.filter((x) => x !== id)
      : [...edits.excluded, id];
    commit({ ...edits, excluded });
  };
  const saveCaption = (id: string) => {
    commit({ ...edits, captions: { ...edits.captions, [id]: draft } });
    setEditing(null);
  };
  const generate = async () => {
    setBusy(true);
    try {
      const days = [...new Set(bundle.pins.map((p) => p.day_index))];
      for (const d of days) {
        await api.summarize(tripId, d);
      }
      const next = await api.tripMessages(tripId);
      setMessages(next);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const w = 220;
  const h = 140;
  const pts = projectPins(raw.route, w, h, 18);
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-paper">
      <div className="flex flex-none items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Your scrapbook
          </div>
          <h2 className="font-display text-xl font-extrabold leading-tight">{raw.title}</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Collected here: {raw.pinCount} places · {raw.photoCount} photos · {raw.noteCount} notes
            · {raw.chatCount} journal moments
            {excludedCount ? ` · you hid ${excludedCount}` : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => void generate()} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Gathering…
            </>
          ) : (
            <>
              <ArtIcon name="scrapbook" size={24} />
              Generate scrapbook
            </>
          )}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="scrapbook-content scrapbook-route mb-6 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              The path we took
            </div>
            <div className="text-[11px] text-muted">
              {prettyDate(raw.start)} → {prettyDate(raw.end)} · {raw.km} km
            </div>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-28 w-full rounded-xl bg-[#ede7dc]">
            {path && (
              <path d={path} fill="none" stroke="#8b7cb8" strokeWidth="3" strokeLinejoin="round" />
            )}
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3f3a36" />
            ))}
          </svg>
          <ol className="mt-2 columns-2 gap-3 text-[11px] text-ink">
            {raw.route.map((p, i) => (
              <li key={`${p.name}-${i}`} className="break-inside-avoid">
                <span className="text-accent">{String(i + 1).padStart(2, '0')}</span> {p.name}
              </li>
            ))}
          </ol>
        </div>

        {raw.items.some((item) => item.kind === 'photo') && (
          <section className="scrapbook-content mb-6">
            <h3 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Little windows into the trip
            </h3>
            <div className="scrapbook-photos">
              {raw.items
                .filter((i): i is Extract<ScrapItem, { kind: 'photo' }> => i.kind === 'photo')
                .map((p, i) => {
                  const hidden = edits.excluded.includes(p.id);
                  const caption = edits.captions[p.id] ?? p.caption;
                  return (
                    <figure
                      key={p.id}
                      className={cx(
                        'polaroid p-2',
                        i % 2 ? 'rotate-1' : '-rotate-1',
                        hidden && 'opacity-40',
                      )}
                    >
                      <img
                        src={fileUrl(p.thumb)}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                      <figcaption className="mt-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="hand-caption text-[18px]">{p.pinName}</span>
                          <Mark source={p.source} />
                        </div>
                        {editing === p.id ? (
                          <form
                            className="mt-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveCaption(p.id);
                            }}
                          >
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              aria-label={`Caption for ${p.pinName}`}
                              className="w-full rounded-md border border-line bg-paper px-2 py-1 text-xs outline-none"
                            />
                            <div className="mt-2 flex gap-3">
                              <button type="submit" className="text-xs font-bold text-accent">
                                Save caption
                              </button>
                              <button
                                type="button"
                                className="text-xs text-muted"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="mt-0.5 text-left text-[11px] text-muted"
                            onClick={() => {
                              setEditing(p.id);
                              setDraft(caption);
                            }}
                          >
                            {caption || 'Tap to write a caption'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          className="mt-1 text-[10px] uppercase tracking-wide text-accent"
                        >
                          {hidden ? 'Include' : 'Hide'}
                        </button>
                      </figcaption>
                    </figure>
                  );
                })}
            </div>
          </section>
        )}

        {raw.items.some((item) => item.kind !== 'photo') && (
          <section className="scrapbook-content scrapbook-notes">
            <h3 className="col-span-full px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Words worth keeping
            </h3>
            {raw.items
              .filter((i) => i.kind !== 'photo')
              .map((item) => {
                const hidden = edits.excluded.includes(item.id);
                const text =
                  edits.captions[item.id] ?? (item.kind === 'note' ? item.text : item.text);
                return (
                  <article
                    key={item.id}
                    className={cx(
                      'scrapbook-note border border-line bg-card px-4 py-3 text-sm',
                      hidden && 'opacity-40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Mark source={item.source} />
                      {item.kind === 'note' && item.pinName && (
                        <span className="text-[10px] text-muted">{item.pinName}</span>
                      )}
                    </div>
                    {editing === item.id ? (
                      <form
                        className="mt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveCaption(item.id);
                        }}
                      >
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          aria-label="Edit scrapbook text"
                          className="w-full rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none"
                        />
                        <div className="mt-2 flex gap-3">
                          <Button type="submit" size="sm">
                            Save changes
                          </Button>
                          <button
                            type="button"
                            className="text-xs text-muted"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-1 leading-snug">{text}</p>
                    )}
                    <div className="mt-1.5 flex gap-3 text-[10px] uppercase tracking-wide">
                      <button
                        type="button"
                        className="text-accent"
                        onClick={() => {
                          setEditing(item.id);
                          setDraft(text);
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="text-muted" onClick={() => toggle(item.id)}>
                        {hidden ? 'Include again' : 'Leave out'}
                      </button>
                    </div>
                  </article>
                );
              })}
          </section>
        )}
        {raw.items.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">
            Nothing in the notebook yet. Drop photos, write a note, or talk to the journal — then
            generate.
          </p>
        )}
      </div>
    </div>
  );
}

function Mark({ source }: { source: 'you' | 'ai' }) {
  return (
    <span
      className={cx(
        'rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
        source === 'ai' ? 'bg-accent-soft text-accent' : 'bg-paper text-muted',
      )}
    >
      {source === 'ai' ? 'AI wrote' : 'you wrote'}
    </span>
  );
}
