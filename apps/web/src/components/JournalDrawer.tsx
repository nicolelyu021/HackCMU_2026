'use client';
import { useEffect, useRef, useState } from 'react';
import type { Message, TripBundle } from '@pinlog/schema';
import { api } from '@/lib/api';
import { Button, Chip, Sheet, Spinner, cx } from './ui';

/** Meeting notes: "talk to your journal" — trip-level chat grounded in notes, plus the "Summarize my day" chip. */
export function JournalDrawer({
  bundle,
  todayIndex,
  onClose,
  onError,
}: {
  bundle: TripBundle;
  todayIndex: number | null;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const tripId = bundle.trip.id;
  const [history, setHistory] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [live, setLive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api.tripMessages(tripId).then(setHistory, onError);
  }, [tripId, onError]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [history, live]);

  const now = () => new Date().toISOString();
  const send = async (message: string) => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setText('');
    const tmp: Message = {
      id: `tmp-${Date.now()}`,
      trip_id: tripId,
      pin_id: null,
      role: 'user',
      content: message,
      tool_calls: null,
      created_at: now(),
    };
    setHistory((h) => [...h, tmp]);
    setLive('');
    let acc = '';
    try {
      await api.chat(tripId, message, (ev) => {
        if (ev.type === 'delta') {
          acc += ev.text;
          setLive(acc);
        } else if (ev.type === 'done') {
          setHistory((h) => [
            ...h,
            {
              id: ev.message_id,
              trip_id: tripId,
              pin_id: null,
              role: 'assistant',
              content: ev.content,
              tool_calls: null,
              created_at: now(),
            },
          ]);
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
  const summarize = async () => {
    if (busy) return;
    setBusy(true);
    const day = todayIndex ?? undefined;
    const label = `Summarize my day${day ? ` (day ${day})` : ''}`;
    setHistory((h) => [
      ...h,
      {
        id: `tmp-${Date.now()}`,
        trip_id: tripId,
        pin_id: null,
        role: 'user',
        content: label,
        tool_calls: null,
        created_at: now(),
      },
    ]);
    setLive('');
    try {
      const res = await api.summarize(tripId, day);
      setHistory((h) => [
        ...h,
        {
          id: res.message_id,
          trip_id: tripId,
          pin_id: null,
          role: 'assistant',
          content: res.summary,
          tool_calls: null,
          created_at: now(),
        },
      ]);
    } catch (e) {
      onError(e);
    } finally {
      setLive(null);
      setBusy(false);
    }
  };
  const notesCount = bundle.entries.length;
  return (
    <Sheet desktopClass="md:h-[calc(100vh-6.5rem)] md:w-[400px]">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <div className="text-xs text-slate-500">Talk to your journal</div>
          <h2 className="text-lg font-bold leading-tight">{bundle.trip.title}</h2>
          <div className="text-[11px] text-slate-500">
            {bundle.pins.length} pins · {notesCount} notes · {bundle.media.length} photos · answers
            only from what you wrote
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {history.map((m) => (
          <div
            key={m.id}
            className={cx(
              'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
              m.role === 'user'
                ? 'ml-auto bg-slate-900 text-white'
                : 'border border-slate-200 bg-white',
            )}
          >
            {m.content}
          </div>
        ))}
        {live !== null && (
          <div
            className={cx(
              'max-w-[92%] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm',
              live ? 'caret' : '',
            )}
          >
            {live || <Spinner />}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip onClick={summarize} className="border-orange-300 bg-orange-50 text-orange-900">
            ✨ Summarize my day
          </Chip>
          <Chip onClick={() => send('What did we do yesterday?')}>What did we do yesterday?</Chip>
          <Chip onClick={() => send("What's left today?")}>What&apos;s left today?</Chip>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask your journal…"
            className="flex-1 rounded-full border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-orange-400"
          />
          <Button type="submit" disabled={busy || !text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
