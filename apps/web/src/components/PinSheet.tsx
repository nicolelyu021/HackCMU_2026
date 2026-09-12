'use client';
import { useEffect, useRef, useState } from 'react';
import {
  dateForDay,
  type Entry,
  type Media,
  type Message,
  type Mood,
  type Pin,
  type TripBundle,
} from '@pinlog/schema';
import { api, fileUrl } from '@/lib/api';
import {
  KIND_EMOJI,
  KIND_LABEL,
  MOOD_EMOJI,
  clock,
  isVerified,
  prettyDate,
  windowLabel,
} from '@/lib/format';
import { Button, Chip, Sheet, Spinner, cx } from './ui';

type Tab = 'info' | 'photos' | 'notes' | 'ask';

/** MAP-2: Info / Photos / Notes / Ask for one pin. */
export function PinSheet({
  bundle,
  pin,
  onClose,
  onChanged,
  onError,
  initialTab = 'info',
}: {
  bundle: TripBundle;
  pin: Pin;
  onClose: () => void;
  onChanged: () => void;
  onError: (e: unknown) => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const photos = bundle.media.filter((m) => m.pin_id === pin.id);
  const notes = bundle.entries.filter((e) => e.pin_id === pin.id);
  useEffect(() => setTab(initialTab), [pin.id, initialTab]);
  return (
    <Sheet>
      <div className="flex items-start justify-between gap-2 border-b border-line p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>
              {KIND_EMOJI[pin.kind]} {KIND_LABEL[pin.kind]}
            </span>
            <span>
              · Day {pin.day_index} ·{' '}
              {prettyDate(dateForDay(bundle.trip.start_date, pin.day_index))}
            </span>
          </div>
          <h2 className="mt-0.5 truncate font-display text-lg font-bold leading-tight">
            {pin.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-paper px-2 py-0.5 font-medium">
              {windowLabel(pin)}
            </span>
            {isVerified(pin) ? (
              <span
                className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent"
                title={pin.place_id ?? ''}
              >
                ✓ verified on OpenStreetMap
              </span>
            ) : (
              <span className="rounded-full bg-paper px-2 py-0.5 font-medium text-muted">
                {pin.source === 'user'
                  ? 'added by you'
                  : pin.source === 'photo'
                    ? 'from a photo'
                    : 'unverified'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-muted hover:bg-paper"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="flex gap-1 border-b border-line px-3 py-2">
        {(
          [
            ['info', 'Info'],
            ['photos', `Photos${photos.length ? ` · ${photos.length}` : ''}`],
            ['notes', `Notes${notes.length ? ` · ${notes.length}` : ''}`],
            ['ask', 'Ask'],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'info' && (
          <InfoTab pin={pin} onChanged={onChanged} onError={onError} onClose={onClose} />
        )}
        {tab === 'photos' && <PhotosTab photos={photos} onChanged={onChanged} onError={onError} />}
        {tab === 'notes' && (
          <NotesTab pin={pin} notes={notes} onChanged={onChanged} onError={onError} />
        )}
        {tab === 'ask' && <AskTab pin={pin} notesCount={notes.length} onError={onError} />}
      </div>
    </Sheet>
  );
}

function InfoTab({
  pin,
  onChanged,
  onError,
  onClose,
}: {
  pin: Pin;
  onChanged: () => void;
  onError: (e: unknown) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(clock(pin.planned_start));
  const [end, setEnd] = useState(clock(pin.planned_end));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStart(clock(pin.planned_start));
    setEnd(clock(pin.planned_end));
  }, [pin.id, pin.planned_start, pin.planned_end]);
  const date = pin.planned_start?.slice(0, 10) ?? null;
  const saveTime = async () => {
    if (!date || !start || !end) return;
    setBusy(true);
    try {
      await api.updatePin(pin.id, {
        planned_start: `${date}T${start}:00`,
        planned_end: `${date}T${end}:00`,
      });
      onChanged();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${pin.name}"? Photos go back to the tray, notes are removed.`))
      return;
    try {
      await api.deletePin(pin.id);
      onClose();
      onChanged();
    } catch (e) {
      onError(e);
    }
  };
  return (
    <div className="space-y-4 p-4 text-sm">
      {pin.ai_reason && (
        <div className="rounded-xl bg-accent-soft p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">
            Why this pin
          </div>
          <p className="mt-1">{pin.ai_reason}</p>
        </div>
      )}
      {pin.address && <div className="text-slate-600">📮 {pin.address}</div>}
      <div className="text-xs text-slate-500">
        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
      </div>
      {date && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Planned time
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-line px-2 py-1"
            />
            <span>→</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-line px-2 py-1"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveTime}
              disabled={
                busy || (start === clock(pin.planned_start) && end === clock(pin.planned_end))
              }
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <div className="pt-2">
        <Button size="sm" variant="danger" onClick={remove}>
          Delete pin
        </Button>
      </div>
    </div>
  );
}

function PhotosTab({
  photos,
  onChanged,
  onError,
}: {
  photos: Media[];
  onChanged: () => void;
  onError: (e: unknown) => void;
}) {
  if (photos.length === 0)
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        No photos here yet. Drop photos on the map — the ones taken here land automatically.
      </div>
    );
  const toTray = async (m: Media) => {
    try {
      await api.updateMedia(m.id, { pin_id: null });
      onChanged();
    } catch (e) {
      onError(e);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {photos.map((m) => (
        <figure key={m.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
          <a href={fileUrl(m.storage_path)} target="_blank" rel="noreferrer">
            <img
              src={fileUrl(m.thumb_path)}
              alt={m.caption ?? ''}
              className="aspect-square w-full object-cover"
            />
          </a>
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] text-white">
            <div className="flex items-center justify-between">
              <span>{m.taken_at ? clock(m.taken_at) : '—'}</span>
              <span className="rounded bg-white/20 px-1">{m.assign_method}</span>
            </div>
            {m.caption && <div className="mt-0.5 line-clamp-2 opacity-90">{m.caption}</div>}
          </figcaption>
          <button
            onClick={() => toTray(m)}
            className="absolute right-1.5 top-1.5 hidden rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 group-hover:block"
            title="Move back to the unsorted tray"
          >
            to tray
          </button>
        </figure>
      ))}
    </div>
  );
}

const MOODS: Mood[] = ['great', 'good', 'meh', 'tired', 'bad'];

function NotesTab({
  pin,
  notes,
  onChanged,
  onError,
}: {
  pin: Pin;
  notes: Entry[];
  onChanged: () => void;
  onError: (e: unknown) => void;
}) {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.createPinEntry(pin.id, { text: text.trim(), mood });
      setText('');
      setMood(null);
      onChanged();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (e: Entry) => {
    try {
      await api.deleteEntry(e.id);
      onChanged();
    } catch (err) {
      onError(err);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-2 p-3">
        {notes.length === 0 && (
          <li className="p-3 text-center text-sm text-slate-500">
            Write the one detail you want to remember. The vlog narration only uses what you write
            here.
          </li>
        )}
        {notes.map((e) => (
          <li key={e.id} className="group rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-800">{e.text}</p>
              <span className="text-lg">{e.mood ? MOOD_EMOJI[e.mood] : ''}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {new Date(e.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button onClick={() => remove(e)} className="hidden text-red-600 group-hover:block">
                delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-200 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={`Quick note at ${pin.name}…`}
          className="w-full resize-none rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? null : m)}
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-lg',
                  mood === m ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-paper',
                )}
                title={m}
              >
                {MOOD_EMOJI[m]}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={add} disabled={busy || !text.trim()}>
            Save note
          </Button>
        </div>
      </div>
    </div>
  );
}

/** MAP-3 (in-lite): streamed, grounded in pin + trip + notes; no tools. */
function AskTab({
  pin,
  notesCount,
  onError,
}: {
  pin: Pin;
  notesCount: number;
  onError: (e: unknown) => void;
}) {
  const [history, setHistory] = useState<Message[]>([]);
  const [q, setQ] = useState('');
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api.pinMessages(pin.id).then(setHistory, onError);
  }, [pin.id, onError]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [history, live]);
  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ('');
    const userMsg: Message = {
      id: `tmp-${Date.now()}`,
      trip_id: pin.trip_id,
      pin_id: pin.id,
      role: 'user',
      content: question,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setHistory((h) => [...h, userMsg]);
    setLive('');
    let acc = '';
    try {
      await api.ask(pin.id, question, (ev) => {
        if (ev.type === 'delta') {
          acc += ev.text;
          setLive(acc);
        } else if (ev.type === 'done') {
          const saved: Message = { ...userMsg, id: `${ev.message_id}-q` };
          const answer: Message = {
            id: ev.message_id,
            trip_id: pin.trip_id,
            pin_id: pin.id,
            role: 'assistant',
            content: ev.content,
            tool_calls: null,
            created_at: new Date().toISOString(),
          };
          setHistory((h) => [...h.filter((m) => m.id !== userMsg.id), saved, answer]);
          setLive(null);
        } else if (ev.type === 'error') {
          onError(new Error(ev.message));
          setLive(null);
        }
      });
    } catch (e) {
      onError(e);
      setLive(null);
    } finally {
      setBusy(false);
    }
  };
  const suggestions = [
    'What should I not miss here?',
    'How long do we have here?',
    notesCount ? 'What did I write here?' : 'What comes next?',
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 p-3">
        <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600">
          Answers only from your plan, your notes and photo captions — no web search. Sentences that
          use a note start with <b>“From your notes:”</b>.
        </div>
        {history.map((m) => (
          <div
            key={m.id}
            className={cx(
              'max-w-[92%] rounded-2xl px-3 py-2 text-sm',
              m.role === 'user' ? 'ml-auto bg-ink text-paper' : 'border border-line bg-card',
            )}
          >
            {m.content}
          </div>
        ))}
        {live !== null && (
          <div
            className={cx(
              'max-w-[92%] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm',
              'caret',
            )}
          >
            {live}
          </div>
        )}
        {history.length === 0 && live === null && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((s) => (
              <Chip key={s} onClick={() => send(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        className="flex gap-2 border-t border-slate-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask about ${pin.name}…`}
          className="flex-1 rounded-full border border-line bg-card px-3.5 py-2 text-sm outline-none focus:border-accent"
        />
        <Button type="submit" disabled={busy || !q.trim()}>
          {busy ? <Spinner className="border-white" /> : 'Ask'}
        </Button>
      </form>
    </div>
  );
}
