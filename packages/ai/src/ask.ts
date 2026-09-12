import {
  NotFoundError,
  nowNaive,
  type AskEvent,
  type AskRequest,
  type ChatRequest,
  type LLMMessage,
  type LLMTask,
  type Message,
  type Ports,
  type SummaryRequest,
  type SummaryResponse,
} from '@pinlog/schema';
import { collectNotes, dayIndexForNow, describePinContext, describeTimeline } from './context';

export interface AskOptions {
  /** Trip-local "now" (NaiveDateTime); defaults to the machine clock. */
  now?: string;
  signal?: AbortSignal;
}

const GROUNDING = `You are the traveler's own travel journal, answering in first person plural if they travel with others ("we"), otherwise "you".
You know ONLY what is in the context below: the plan, the pins, the traveler's notes and photo captions, and the current time. No web search, no weather, no prices you were not given.
- If the answer is in the notes or captions, use it and start that sentence with "From your notes:" (or "From your photos:").
- General knowledge about the type of place is fine when clearly marked as such ("Museums like this usually…"); never state opening hours, prices or events as facts unless they are in the context.
- If you do not know, say so in one short sentence and suggest what to check on site.
- Be concrete and brief: at most 3 sentences, no bullet lists, no emoji.`;

export const ASK_SYSTEM = `${GROUNDING}\nYou are answering AT this pin, on this date, for this traveler.`;
export const CHAT_SYSTEM = `${GROUNDING}\nYou are the trip-level journal: you can talk about any day or pin of the trip. If asked to summarize a day, cover the pins in order and end with one "From your notes:" detail.`;
export const SUMMARY_SYSTEM = `You write the traveler's own diary summary for one day, in first person (plural if they travel with others). Exactly 3 sentences: what happened in order, the highlight, and finally one sentence that starts with "From your notes:" quoting one concrete detail from their notes. Use ONLY the notes and photo captions in the context; invent nothing; no emoji.`;

const HISTORY_LIMIT = 12;

function historyMessages(history: Message[]): LLMMessage[] {
  const recent = history.slice(-HISTORY_LIMIT);
  const out: LLMMessage[] = [];
  for (const m of recent) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n${m.content}`;
    else out.push({ role: m.role, content: m.content });
  }
  // the transcript must start with the user
  while (out.length && out[0]!.role !== 'user') out.shift();
  return out;
}

async function* streamAndPersist(
  ports: Pick<Ports, 'repo' | 'llm'>,
  args: {
    task: LLMTask;
    system: string;
    history: Message[];
    userText: string;
    inputs: unknown;
    trip_id: string;
    pin_id: string | null;
    signal?: AbortSignal;
  },
): AsyncIterable<AskEvent> {
  await ports.repo.messages.create({
    trip_id: args.trip_id,
    pin_id: args.pin_id,
    role: 'user',
    content: args.userText,
    tool_calls: null,
  });
  const messages: LLMMessage[] = [
    ...historyMessages(args.history),
    { role: 'user', content: args.userText },
  ];
  let full = '';
  try {
    for await (const ev of ports.llm.stream(
      {
        task: args.task,
        system: args.system,
        messages,
        inputs: args.inputs,
        effort: 'low',
        max_tokens: 800,
      },
      args.signal,
    )) {
      if (ev.type === 'delta') {
        full += ev.text;
        yield { type: 'delta', text: ev.text };
      } else full = ev.text || full;
    }
  } catch (err) {
    if (args.signal?.aborted) return;
    yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
    return;
  }
  if (args.signal?.aborted) return;
  const saved = await ports.repo.messages.create({
    trip_id: args.trip_id,
    pin_id: args.pin_id,
    role: 'assistant',
    content: full,
    tool_calls: null,
  });
  yield { type: 'done', message_id: saved.id, content: full };
}

/** Owner C. Pin-level Ask (MAP-3, no tools): streamed, grounded in pin + trip + notes + captions, history saved to the pin. */
export async function* ask(
  ports: Pick<Ports, 'repo' | 'llm'>,
  pin_id: string,
  req: AskRequest,
  opts: AskOptions = {},
): AsyncIterable<AskEvent> {
  const pin = await ports.repo.pins.get(pin_id);
  if (!pin) throw new NotFoundError('pin', pin_id);
  const trip = await ports.repo.trips.get(pin.trip_id);
  if (!trip) throw new NotFoundError('trip', pin.trip_id);
  const [pins, entries, media, history] = await Promise.all([
    ports.repo.pins.listByTrip(trip.id),
    ports.repo.entries.listByPin(pin.id),
    ports.repo.media.listByPin(pin.id),
    ports.repo.messages.listByPin(pin.id),
  ]);
  const now = opts.now ?? nowNaive();
  const context = describePinContext({ trip, pin, pins, entries, media, now });
  yield* streamAndPersist(ports, {
    task: 'ask',
    system: `${ASK_SYSTEM}\n\n=== CONTEXT ===\n${context}`,
    history,
    userText: req.question,
    inputs: {
      pin: {
        id: pin.id,
        name: pin.name,
        planned_start: pin.planned_start,
        planned_end: pin.planned_end,
      },
      notes: entries.map((e) => e.text),
      question: req.question,
    },
    trip_id: trip.id,
    pin_id: pin.id,
    signal: opts.signal,
  });
}

/** Owner C. Trip-level "talk to your journal" (meeting notes): same grounding, whole-trip timeline. */
export async function* chat(
  ports: Pick<Ports, 'repo' | 'llm'>,
  trip_id: string,
  req: ChatRequest,
  opts: AskOptions = {},
): AsyncIterable<AskEvent> {
  const bundle = await ports.repo.trips.bundle(trip_id);
  if (!bundle) throw new NotFoundError('trip', trip_id);
  const history = await ports.repo.messages.listByTrip(trip_id);
  const now = opts.now ?? nowNaive();
  const context = describeTimeline(bundle, { now });
  const notes = collectNotes(bundle);
  yield* streamAndPersist(ports, {
    task: 'chat',
    system: `${CHAT_SYSTEM}\n\n=== CONTEXT ===\n${context}`,
    history,
    userText: req.message,
    inputs: {
      summary: notes.length
        ? `${bundle.pins.length} pins and ${notes.length} notes; latest note: "${notes[notes.length - 1]}"`
        : `${bundle.pins.length} pins, no notes yet`,
      message: req.message,
    },
    trip_id,
    pin_id: null,
    signal: opts.signal,
  });
}

/** Owner C. "Summarize my day": default = the current day inside the trip, else the last day. Persisted as a chat exchange. */
export async function summarize(
  ports: Pick<Ports, 'repo' | 'llm'>,
  trip_id: string,
  req: SummaryRequest,
  opts: AskOptions = {},
): Promise<SummaryResponse> {
  const bundle = await ports.repo.trips.bundle(trip_id);
  if (!bundle) throw new NotFoundError('trip', trip_id);
  const now = opts.now ?? nowNaive();
  const lastDay = Math.max(1, ...bundle.pins.map((p) => p.day_index));
  const day_index = req.day_index ?? dayIndexForNow(bundle.trip, now) ?? lastDay;
  const dayPins = bundle.pins
    .filter((p) => p.day_index === day_index)
    .sort((a, b) => a.order_index - b.order_index);
  const notes = collectNotes(bundle, day_index);
  const userText = `Summarize my day (day ${day_index})`;
  const context = describeTimeline(bundle, { day_index, now });
  const { text } = await ports.llm.complete({
    task: 'summary',
    system: `${SUMMARY_SYSTEM}\n\n=== CONTEXT ===\n${context}`,
    messages: [{ role: 'user', content: userText }],
    inputs: {
      day_index,
      pins: dayPins.length
        ? `from ${dayPins[0]!.name} to ${dayPins[dayPins.length - 1]!.name}`
        : 'nowhere yet',
      note: notes[0] ? `"${notes[0]}"` : 'no notes yet.',
    },
    effort: 'low',
    max_tokens: 600,
  });
  await ports.repo.messages.create({
    trip_id,
    pin_id: null,
    role: 'user',
    content: userText,
    tool_calls: null,
  });
  const saved = await ports.repo.messages.create({
    trip_id,
    pin_id: null,
    role: 'assistant',
    content: text,
    tool_calls: null,
  });
  return { summary: text, day_index, message_id: saved.id };
}
