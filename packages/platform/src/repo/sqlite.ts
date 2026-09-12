import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  Entry,
  LockedPinError,
  Media,
  Message,
  NotFoundError,
  Pin,
  Trip,
  Vlog,
  type CreateTripInput,
  type NewEntry,
  type NewMedia,
  type NewMessage,
  type NewPin,
  type ReorderPinsInput,
  type ReplanDiff,
  type Repo,
  type RepoRows,
  type TripBundle,
  type UpdatePinInput,
  type UpdateTripInput,
  type VlogSettings,
} from '@pinlog/schema';

/**
 * Owner B. SQLite Repo on node:sqlite (synchronous, one file, no migrations framework — schema change = `pnpm seed:reset`).
 * Behaviour mirrors createMemoryRepo (same ordering, same errors); packages/schema/test/memory-repo.test.ts is the spec.
 * JSON columns are TEXT parsed by zod at the boundary; lat/lng are REAL (haversine in code).
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, destination TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL,
  party TEXT NOT NULL, interests TEXT NOT NULL, pace TEXT NOT NULL, budget TEXT NOT NULL, language TEXT NOT NULL,
  status TEXT NOT NULL, visibility TEXT NOT NULL, share_slug TEXT UNIQUE, cover_media_id TEXT,
  center_lat REAL, center_lng REAL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pins (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL, place_id TEXT, address TEXT, lat REAL NOT NULL, lng REAL NOT NULL,
  day_index INTEGER NOT NULL, order_index INTEGER NOT NULL, planned_start TEXT, planned_end TEXT,
  kind TEXT NOT NULL, source TEXT NOT NULL, ai_reason TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pins_trip ON pins(trip_id, day_index, order_index);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  pin_id TEXT REFERENCES pins(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL, thumb_path TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, mime TEXT NOT NULL,
  taken_at TEXT, lat REAL, lng REAL, exif TEXT, caption TEXT, assign_method TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_trip ON media(trip_id, taken_at);
CREATE INDEX IF NOT EXISTS media_pin ON media(pin_id);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE, day_index INTEGER, text TEXT NOT NULL, mood TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_trip ON entries(trip_id, created_at);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, tool_calls TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_trip ON messages(trip_id, created_at);
CREATE TABLE IF NOT EXISTS vlogs (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  status TEXT NOT NULL, settings TEXT NOT NULL, script TEXT, video_path TEXT, duration_s REAL, error TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vlogs_trip ON vlogs(trip_id, created_at);
`;

type Row = Record<string, unknown>;
type SqlValue = string | number | null;

const now = () => new Date().toISOString();
const uuid = () => globalThis.crypto.randomUUID();
const j = (v: unknown): string | null => (v === undefined || v === null ? null : JSON.stringify(v));
const pj = <T>(v: unknown): T | null =>
  v === null || v === undefined ? null : (JSON.parse(String(v)) as T);
const sv = (v: unknown): SqlValue => (v === undefined || v === null ? null : (v as SqlValue));

const tripFromRow = (r: Row): Trip =>
  Trip.parse({
    ...r,
    party: pj(r.party),
    interests: pj(r.interests) ?? [],
  });
const pinFromRow = (r: Row): Pin => Pin.parse(r);
const mediaFromRow = (r: Row): Media => Media.parse({ ...r, exif: pj(r.exif) });
const entryFromRow = (r: Row): Entry => Entry.parse(r);
const messageFromRow = (r: Row): Message => Message.parse({ ...r, tool_calls: pj(r.tool_calls) });
const vlogFromRow = (r: Row): Vlog =>
  Vlog.parse({ ...r, settings: pj(r.settings), script: pj(r.script) });

export interface SqliteRepoOptions {
  /** File path or ':memory:'. */
  path: string;
}

export function createSqliteRepo(opts: SqliteRepoOptions): Repo {
  if (opts.path !== ':memory:') mkdirSync(dirname(opts.path), { recursive: true });
  const db = new DatabaseSync(opts.path);
  if (opts.path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA_SQL);

  let depth = 0;
  /** Re-entrant transaction: nested calls join the outer one. */
  const tx = <T>(fn: () => T): T => {
    if (depth > 0) return fn();
    db.exec('BEGIN');
    depth++;
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      depth--;
    }
  };

  const all = (sql: string, ...params: SqlValue[]): Row[] =>
    db.prepare(sql).all(...params) as Row[];
  const one = (sql: string, ...params: SqlValue[]): Row | null =>
    (db.prepare(sql).get(...params) as Row | undefined) ?? null;
  const run = (sql: string, ...params: SqlValue[]) => db.prepare(sql).run(...params);

  const insert = (table: string, row: Record<string, SqlValue>) => {
    const keys = Object.keys(row);
    run(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
      ...keys.map((k) => row[k]!),
    );
  };
  /** UPDATE with only the defined keys of `patch`; throws NotFoundError when no row matched. */
  const patchRow = (
    table: string,
    entity: string,
    id: string,
    patch: Record<string, SqlValue | undefined>,
  ) => {
    const keys = Object.keys(patch).filter((k) => patch[k] !== undefined);
    if (keys.length === 0) {
      if (!one(`SELECT id FROM ${table} WHERE id = ?`, id)) throw new NotFoundError(entity, id);
      return;
    }
    const res = run(
      `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      ...keys.map((k) => patch[k] as SqlValue),
      id,
    );
    if (res.changes === 0) throw new NotFoundError(entity, id);
  };

  const tripRow = (t: Trip): Record<string, SqlValue> => ({
    id: t.id,
    title: t.title,
    destination: t.destination,
    start_date: t.start_date,
    end_date: t.end_date,
    party: JSON.stringify(t.party),
    interests: JSON.stringify(t.interests),
    pace: t.pace,
    budget: t.budget,
    language: t.language,
    status: t.status,
    visibility: t.visibility,
    share_slug: t.share_slug,
    cover_media_id: t.cover_media_id,
    center_lat: t.center_lat,
    center_lng: t.center_lng,
    created_at: t.created_at,
  });
  const pinRow = (p: Pin): Record<string, SqlValue> => ({
    id: p.id,
    trip_id: p.trip_id,
    name: p.name,
    place_id: p.place_id,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    day_index: p.day_index,
    order_index: p.order_index,
    planned_start: p.planned_start,
    planned_end: p.planned_end,
    kind: p.kind,
    source: p.source,
    ai_reason: p.ai_reason,
    created_at: p.created_at,
  });
  const mediaRow = (m: Media): Record<string, SqlValue> => ({
    id: m.id,
    trip_id: m.trip_id,
    pin_id: m.pin_id,
    storage_path: m.storage_path,
    thumb_path: m.thumb_path,
    width: m.width,
    height: m.height,
    mime: m.mime,
    taken_at: m.taken_at,
    lat: m.lat,
    lng: m.lng,
    exif: j(m.exif),
    caption: m.caption,
    assign_method: m.assign_method,
    created_at: m.created_at,
  });
  const entryRow = (e: Entry): Record<string, SqlValue> => ({
    id: e.id,
    trip_id: e.trip_id,
    pin_id: e.pin_id,
    day_index: e.day_index,
    text: e.text,
    mood: e.mood,
    created_at: e.created_at,
  });
  const messageRow = (m: Message): Record<string, SqlValue> => ({
    id: m.id,
    trip_id: m.trip_id,
    pin_id: m.pin_id,
    role: m.role,
    content: m.content,
    tool_calls: j(m.tool_calls),
    created_at: m.created_at,
  });
  const vlogRow = (v: Vlog): Record<string, SqlValue> => ({
    id: v.id,
    trip_id: v.trip_id,
    status: v.status,
    settings: JSON.stringify(v.settings),
    script: j(v.script),
    video_path: v.video_path,
    duration_s: v.duration_s,
    error: v.error,
    created_at: v.created_at,
    updated_at: v.updated_at,
  });

  const PINS_ORDER = 'ORDER BY day_index, order_index, created_at';
  const MEDIA_ORDER = 'ORDER BY taken_at IS NULL, taken_at, created_at';

  const listPins = (trip_id: string) =>
    all(`SELECT * FROM pins WHERE trip_id = ? ${PINS_ORDER}`, trip_id).map(pinFromRow);
  const getPin = (id: string) => {
    const r = one('SELECT * FROM pins WHERE id = ?', id);
    return r ? pinFromRow(r) : null;
  };
  const nextOrder = (trip_id: string, day_index: number) =>
    Number(
      one('SELECT COUNT(*) AS n FROM pins WHERE trip_id = ? AND day_index = ?', trip_id, day_index)
        ?.n ?? 0,
    );
  const deletePin = (id: string) =>
    tx(() => {
      if (!one('SELECT id FROM pins WHERE id = ?', id)) throw new NotFoundError('pin', id);
      // photos go back to the tray; notes and Ask history on the pin are gone (FK cascade)
      run("UPDATE media SET pin_id = NULL, assign_method = 'none' WHERE pin_id = ?", id);
      run('DELETE FROM pins WHERE id = ?', id);
    });

  const repo: Repo = {
    trips: {
      async list() {
        return all('SELECT * FROM trips ORDER BY created_at DESC').map(tripFromRow);
      },
      async get(id) {
        const r = one('SELECT * FROM trips WHERE id = ?', id);
        return r ? tripFromRow(r) : null;
      },
      async getBySlug(slug) {
        const r = one('SELECT * FROM trips WHERE share_slug = ?', slug);
        return r ? tripFromRow(r) : null;
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
        insert('trips', tripRow(trip));
        return trip;
      },
      async update(id, patch: UpdateTripInput & { share_slug?: string | null }) {
        patchRow('trips', 'trip', id, {
          title: patch.title,
          status: patch.status,
          start_date: patch.start_date,
          end_date: patch.end_date,
          cover_media_id: patch.cover_media_id,
          language: patch.language,
          visibility: patch.visibility,
          center_lat: patch.center_lat,
          center_lng: patch.center_lng,
          share_slug: patch.share_slug,
        });
        return (await repo.trips.get(id))!;
      },
      async delete(id) {
        tx(() => {
          const res = run('DELETE FROM trips WHERE id = ?', id);
          if (res.changes === 0) throw new NotFoundError('trip', id);
          // belt and braces if PRAGMA foreign_keys were ever off
          for (const t of ['pins', 'media', 'entries', 'messages', 'vlogs'])
            run(`DELETE FROM ${t} WHERE trip_id = ?`, id);
        });
      },
      async bundle(id): Promise<TripBundle | null> {
        const trip = await repo.trips.get(id);
        if (!trip) return null;
        return {
          trip,
          pins: listPins(id),
          media: await repo.media.listByTrip(id),
          entries: await repo.entries.listByTrip(id),
        };
      },
    },
    pins: {
      async listByTrip(trip_id) {
        return listPins(trip_id);
      },
      async get(id) {
        return getPin(id);
      },
      async create(input: NewPin) {
        const pin: Pin = { ...input, id: uuid(), created_at: now() };
        insert('pins', pinRow(pin));
        return pin;
      },
      async createMany(inputs) {
        return tx(() => {
          const ts = now();
          return inputs.map((input) => {
            const pin: Pin = { ...input, id: uuid(), created_at: ts };
            insert('pins', pinRow(pin));
            return pin;
          });
        });
      },
      async update(id, patch: UpdatePinInput) {
        patchRow('pins', 'pin', id, {
          name: patch.name,
          address: patch.address,
          lat: patch.lat,
          lng: patch.lng,
          day_index: patch.day_index,
          order_index: patch.order_index,
          planned_start: patch.planned_start,
          planned_end: patch.planned_end,
          kind: patch.kind,
        });
        return getPin(id)!;
      },
      async reorder(trip_id, order: ReorderPinsInput['order']) {
        return tx(() => {
          for (const o of order) {
            const res = run(
              'UPDATE pins SET day_index = ?, order_index = ? WHERE id = ? AND trip_id = ?',
              o.day_index,
              o.order_index,
              o.pin_id,
              trip_id,
            );
            if (res.changes === 0) throw new NotFoundError('pin', o.pin_id);
          }
          return listPins(trip_id);
        });
      },
      async delete(id) {
        deletePin(id);
      },
      async applyDiff(trip_id, diff: ReplanDiff) {
        return tx(() => {
          const touched = [
            ...diff.removed.map((r) => r.pin_id),
            ...diff.changed.map((c) => c.pin_id),
          ];
          for (const id of touched) {
            const p = one('SELECT source FROM pins WHERE id = ? AND trip_id = ?', id, trip_id);
            if (!p) throw new NotFoundError('pin', id);
            if (p.source === 'user') throw new LockedPinError(id);
          }
          for (const r of diff.removed) deletePin(r.pin_id);
          for (const c of diff.changed) {
            patchRow('pins', 'pin', c.pin_id, {
              name: c.patch.name,
              address: c.patch.address,
              lat: c.patch.lat,
              lng: c.patch.lng,
              day_index: c.patch.day_index,
              order_index: c.patch.order_index,
              planned_start: c.patch.planned_start,
              planned_end: c.patch.planned_end,
              kind: c.patch.kind,
            });
          }
          const ts = now();
          for (const a of diff.added) {
            const pin: Pin = {
              ...a,
              trip_id,
              order_index: a.order_index ?? nextOrder(trip_id, a.day_index),
              id: uuid(),
              created_at: ts,
            };
            insert('pins', pinRow(pin));
          }
          return listPins(trip_id);
        });
      },
    },
    media: {
      async listByTrip(trip_id) {
        return all(`SELECT * FROM media WHERE trip_id = ? ${MEDIA_ORDER}`, trip_id).map(
          mediaFromRow,
        );
      },
      async listByPin(pin_id) {
        return all(`SELECT * FROM media WHERE pin_id = ? ${MEDIA_ORDER}`, pin_id).map(mediaFromRow);
      },
      async get(id) {
        const r = one('SELECT * FROM media WHERE id = ?', id);
        return r ? mediaFromRow(r) : null;
      },
      async create(input: NewMedia) {
        const m: Media = { ...input, id: uuid(), created_at: now() };
        insert('media', mediaRow(m));
        return m;
      },
      async update(id, patch) {
        patchRow('media', 'media', id, {
          pin_id: patch.pin_id,
          assign_method: patch.assign_method,
          caption: patch.caption,
        });
        return (await repo.media.get(id))!;
      },
      async delete(id) {
        const res = run('DELETE FROM media WHERE id = ?', id);
        if (res.changes === 0) throw new NotFoundError('media', id);
      },
    },
    entries: {
      async listByTrip(trip_id) {
        return all('SELECT * FROM entries WHERE trip_id = ? ORDER BY created_at', trip_id).map(
          entryFromRow,
        );
      },
      async listByPin(pin_id) {
        return all('SELECT * FROM entries WHERE pin_id = ? ORDER BY created_at', pin_id).map(
          entryFromRow,
        );
      },
      async create(input: NewEntry) {
        const e: Entry = { ...input, id: uuid(), created_at: now() };
        insert('entries', entryRow(e));
        return e;
      },
      async delete(id) {
        const res = run('DELETE FROM entries WHERE id = ?', id);
        if (res.changes === 0) throw new NotFoundError('entry', id);
      },
    },
    messages: {
      async listByPin(pin_id) {
        return all('SELECT * FROM messages WHERE pin_id = ? ORDER BY created_at', pin_id).map(
          messageFromRow,
        );
      },
      async listByTrip(trip_id) {
        return all(
          'SELECT * FROM messages WHERE trip_id = ? AND pin_id IS NULL ORDER BY created_at',
          trip_id,
        ).map(messageFromRow);
      },
      async create(input: NewMessage) {
        const m: Message = { ...input, id: uuid(), created_at: now() };
        insert('messages', messageRow(m));
        return m;
      },
    },
    vlogs: {
      async get(id) {
        const r = one('SELECT * FROM vlogs WHERE id = ?', id);
        return r ? vlogFromRow(r) : null;
      },
      async listByTrip(trip_id) {
        return all('SELECT * FROM vlogs WHERE trip_id = ? ORDER BY created_at DESC', trip_id).map(
          vlogFromRow,
        );
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
        insert('vlogs', vlogRow(v));
        return v;
      },
      async update(id, patch) {
        patchRow('vlogs', 'vlog', id, {
          status: patch.status,
          script: patch.script === undefined ? undefined : j(patch.script),
          video_path: patch.video_path,
          duration_s: patch.duration_s,
          error: patch.error,
          settings: patch.settings === undefined ? undefined : JSON.stringify(patch.settings),
          updated_at: now(),
        });
        return (await repo.vlogs.get(id))!;
      },
    },
    async importRows(rows: RepoRows) {
      tx(() => {
        for (const t of rows.trips ?? []) insert('trips', tripRow(t));
        for (const p of rows.pins ?? []) insert('pins', pinRow(p));
        for (const m of rows.media ?? []) insert('media', mediaRow(m));
        for (const e of rows.entries ?? []) insert('entries', entryRow(e));
        for (const m of rows.messages ?? []) insert('messages', messageRow(m));
        for (const v of rows.vlogs ?? []) insert('vlogs', vlogRow(v));
      });
    },
    close() {
      db.close();
    },
  };
  return repo;
}
