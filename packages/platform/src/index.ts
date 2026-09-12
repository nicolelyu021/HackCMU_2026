// Owner B — public surface of @pinlog/platform. The signatures below are part of the frozen contract
// (services/api/src/container.ts and the seed CLI call them); the implementations are B's to build.
import type { Media, Ports, Repo, StorageProvider, UploadMediaMeta } from '@pinlog/schema';

export interface RepoOptions {
  /** SQLite file path, or ':memory:' for tests. */
  path: string;
}
export type StorageOptions = { kind: 'local'; root: string } | { kind: 'memory' };

export function createRepo(_opts: RepoOptions): Repo {
  throw new Error('TODO(B): createRepo not implemented');
}
export function createStorage(_opts: StorageOptions): StorageProvider {
  throw new Error('TODO(B): createStorage not implemented');
}

export interface IngestInput {
  trip_id: string;
  bytes: Uint8Array;
  meta: UploadMediaMeta;
}
export interface IngestResult {
  media: Media;
  assigned_pin_id: string | null;
  /** Human-readable explanation shown in the landing HUD, e.g. "180 m from Phipps · within window". */
  reason: string;
  distance_m: number | null;
}
export async function ingestPhoto(
  _ports: Pick<Ports, 'repo' | 'storage'>,
  _input: IngestInput,
): Promise<IngestResult> {
  throw new Error('TODO(B): ingestPhoto not implemented');
}

export interface SeedOptions {
  start_date?: string;
  reset?: boolean;
  /** copy = copy committed fixture JPEGs into storage (default; generates them first if missing); generate = regenerate them; skip = rows only, no files (tests). */
  photos?: 'copy' | 'generate' | 'skip';
  log?: (line: string) => void;
}
export interface SeedResult {
  trip_id: string;
  pins: number;
  media: number;
  entries: number;
  vlog_id: string;
}
export async function seedFixtures(
  _ports: Pick<Ports, 'repo' | 'storage'>,
  _opts: SeedOptions = {},
): Promise<SeedResult> {
  throw new Error('TODO(B): seedFixtures not implemented');
}
