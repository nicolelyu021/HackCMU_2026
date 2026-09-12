import type { TripBundle } from './api';
import type { Entry, NewEntry } from './entry';
import { LockedPinError, NotFoundError } from './errors';
import type { ReplanDiff } from './itinerary';
import type { Media, NewMedia } from './media';
import type { Message, NewMessage } from './message';
import type { NewPin, Pin, ReorderPinsInput, UpdatePinInput } from './pin';
import type { Repo } from './ports/repo';
import type { CreateTripInput, Trip, UpdateTripInput } from './trip';
import type { Vlog, VlogSettings } from './vlog';

/**
 * Reference Repo implementation backed by arrays. Used by unit tests in every package and as the behavioural
 * spec for the SQLite repo (same ordering, same errors). Not for production data.
 */
export interface MemoryRepoSeed {
  trip?: Trip;
  trips?: Trip[];
  pins?: Pin[];
  media?: Media[];
  entries?: Entry[];
  messages?: Message[];
  vlog?: Vlog;
  vlogs?: Vlog[];
}

const now = () => new Date().toISOString();
const uuid = () => globalThis.crypto.randomUUID();
const byDayOrder = (a: Pin, b: Pin) => a.day_index - b.day_index || a.order_index - b.order_index;
const byTakenAt = (a: Media, b: Media) =>
  (a.taken_at ?? '9999').localeCompare(b.taken_at ?? '9999') || a.created_at.localeCompare(b.created_at);
const byCreated = <T extends { created_at: string }>(a: T, b: T) => a.created_at.localeCompare(b.created_at);

export function createMemoryRepo(seed: MemoryRepoSeed = {}): Repo {
  const trips: Trip[] = [...(seed.trips ?? []), ...(seed.trip ? [seed.trip] : [])];
  const pins: Pin[] = [...(seed.pins ?? [])];
  const media: Media[] = [...(seed.media ?? [])];
  const entries: Entry[] = [...(seed.entries ?? [])];
  const messages: Message[] = [...(seed.messages ?? [])];
  const vlogs: Vlog[] = [...(seed.vlogs ?? []), ...(seed.vlog ? [seed.vlog] : [])];

  const remove = <T>(arr: T[], pred: (x: T) => boolean) => {
    for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i]!)) arr.splice(i, 1);
  };
  const nextOrder = (trip_id: string, day_index: number) =>
    pins.filter((p) => p.trip_id === trip_id && p.day_index === day_index).length;

  const repo: Repo = {
    trips: {
      async list() {
        return [...trips].sort(byCreated).reverse();
      },
      async get(id) {
        return trips.find((t) => t.id === id) ?? null;
      },
      async getBySlug(slug) {
        return trips.find((t) => t.share_slug === slug) ?? null;
      },
      async create(input: CreateTripInput) {
        const trip: Trip = {
          id: uuid(),
          title: input.title ?? input.destination,
          destination: input.destination,
          start_date: input.start_date,
          end_date: input.end_date,
          party: input.party,
          interests: input.interests,
          pace: input.pace,
          budget: input.budget,
          language: input.language,
          status: 'planning',
          visibility: 'private',
          share_slug: null,
          cover_media_id: null,
          center_lat: null,
          center_lng: null,
          created_at: now(),
        };
        trips.push(trip);
        return trip;
      },
      async update(id, patch: UpdateTripInput & { share_slug?: string | null }) {
        const t = trips.find((x) => x.id === id);
        if (!t) throw new NotFoundError('trip', id);
        Object.assign(t, patch);
        return t;
      },
      async delete(id) {
        if (!trips.some((t) => t.id === id)) throw new NotFoundError('trip', id);
        remove(trips, (t) => t.id === id);
        remove(pins, (p) => p.trip_id === id);
        remove(media, (m) => m.trip_id === id);
        remove(entries, (e) => e.trip_id === id);
        remove(messages, (m) => m.trip_id === id);
        remove(vlogs, (v) => v.trip_id === id);
      },
      async bundle(id): Promise<TripBundle | null> {
        const trip = trips.find((t) => t.id === id);
        if (!trip) return null;
        return {
          trip,
          pins: pins.filter((p) => p.trip_id === id).sort(byDayOrder),
          media: media.filter((m) => m.trip_id === id).sort(byTakenAt),
          entries: entries.filter((e) => e.trip_id === id).sort(byCreated),
        };
      },
    },
    pins: {
      async listByTrip(trip_id) {
        return pins.filter((p) => p.trip_id === trip_id).sort(byDayOrder);
      },
      async get(id) {
        return pins.find((p) => p.id === id) ?? null;
      },
      async create(input: NewPin) {
        const pin: Pin = { ...input, id: uuid(), created_at: now() };
        pins.push(pin);
        return pin;
      },
      async createMany(inputs) {
        return Promise.all(inputs.map((i) => repo.pins.create(i)));
      },
      async update(id, patch: UpdatePinInput) {
        const p = pins.find((x) => x.id === id);
        if (!p) throw new NotFoundError('pin', id);
        Object.assign(p, patch);
        return p;
      },
      async reorder(trip_id, order: ReorderPinsInput['order']) {
        for (const o of order) {
          const p = pins.find((x) => x.id === o.pin_id && x.trip_id === trip_id);
          if (!p) throw new NotFoundError('pin', o.pin_id);
          p.day_index = o.day_index;
          p.order_index = o.order_index;
        }
        return repo.pins.listByTrip(trip_id);
      },
      async delete(id) {
        if (!pins.some((p) => p.id === id)) throw new NotFoundError('pin', id);
        remove(pins, (p) => p.id === id);
        for (const m of media) if (m.pin_id === id) (m.pin_id = null), (m.assign_method = 'none');
        remove(entries, (e) => e.pin_id === id);
        remove(messages, (m) => m.pin_id === id);
      },
      async applyDiff(trip_id, diff: ReplanDiff) {
        const touched = [...diff.removed.map((r) => r.pin_id), ...diff.changed.map((c) => c.pin_id)];
        for (const id of touched) {
          const p = pins.find((x) => x.id === id && x.trip_id === trip_id);
          if (!p) throw new NotFoundError('pin', id);
          if (p.source === 'user') throw new LockedPinError(id);
        }
        for (const r of diff.removed) await repo.pins.delete(r.pin_id);
        for (const c of diff.changed) await repo.pins.update(c.pin_id, c.patch);
        for (const a of diff.added) {
          await repo.pins.create({
            ...a,
            trip_id,
            order_index: a.order_index ?? nextOrder(trip_id, a.day_index),
          });
        }
        return repo.pins.listByTrip(trip_id);
      },
    },
    media: {
      async listByTrip(trip_id) {
        return media.filter((m) => m.trip_id === trip_id).sort(byTakenAt);
      },
      async listByPin(pin_id) {
        return media.filter((m) => m.pin_id === pin_id).sort(byTakenAt);
      },
      async get(id) {
        return media.find((m) => m.id === id) ?? null;
      },
      async create(input: NewMedia) {
        const row: Media = { ...input, id: uuid(), created_at: now() };
        media.push(row);
        return row;
      },
      async update(id, patch) {
        const m = media.find((x) => x.id === id);
        if (!m) throw new NotFoundError('media', id);
        Object.assign(m, patch);
        return m;
      },
      async delete(id) {
        if (!media.some((m) => m.id === id)) throw new NotFoundError('media', id);
        remove(media, (m) => m.id === id);
      },
    },
    entries: {
      async listByTrip(trip_id) {
        return entries.filter((e) => e.trip_id === trip_id).sort(byCreated);
      },
      async listByPin(pin_id) {
        return entries.filter((e) => e.pin_id === pin_id).sort(byCreated);
      },
      async create(input: NewEntry) {
        const e: Entry = { ...input, id: uuid(), created_at: now() };
        entries.push(e);
        return e;
      },
      async delete(id) {
        if (!entries.some((e) => e.id === id)) throw new NotFoundError('entry', id);
        remove(entries, (e) => e.id === id);
      },
    },
    messages: {
      async listByPin(pin_id) {
        return messages.filter((m) => m.pin_id === pin_id).sort(byCreated);
      },
      async listByTrip(trip_id) {
        return messages.filter((m) => m.trip_id === trip_id && m.pin_id === null).sort(byCreated);
      },
      async create(input: NewMessage) {
        const m: Message = { ...input, id: uuid(), created_at: now() };
        messages.push(m);
        return m;
      },
    },
    vlogs: {
      async get(id) {
        return vlogs.find((v) => v.id === id) ?? null;
      },
      async listByTrip(trip_id) {
        return vlogs.filter((v) => v.trip_id === trip_id).sort(byCreated).reverse();
      },
      async create(input: { trip_id: string; settings: VlogSettings; id?: string }) {
        const ts = now();
        const v: Vlog = {
          id: input.id ?? uuid(),
          trip_id: input.trip_id,
          status: 'queued',
          settings: input.settings,
          script: null,
          video_path: null,
          duration_s: null,
          error: null,
          created_at: ts,
          updated_at: ts,
        };
        vlogs.push(v);
        return v;
      },
      async update(id, patch) {
        const v = vlogs.find((x) => x.id === id);
        if (!v) throw new NotFoundError('vlog', id);
        Object.assign(v, patch, { updated_at: now() });
        return v;
      },
    },
    close() {},
  };
  return repo;
}
