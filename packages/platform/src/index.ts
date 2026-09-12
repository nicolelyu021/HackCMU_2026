// Owner B — public surface of @pinlog/platform. The signatures are part of the frozen contract
// (services/api/src/container.ts and the seed CLI call them).
import { createMemoryStorage, type Repo, type StorageProvider } from '@pinlog/schema';
import { createSqliteRepo } from './repo/sqlite';
import { createLocalStorage } from './storage/local';

export interface RepoOptions {
  /** SQLite file path, or ':memory:' for tests. */
  path: string;
}
export type StorageOptions = { kind: 'local'; root: string } | { kind: 'memory' };

export function createRepo(opts: RepoOptions): Repo {
  return createSqliteRepo(opts);
}
export function createStorage(opts: StorageOptions): StorageProvider {
  return opts.kind === 'memory' ? createMemoryStorage() : createLocalStorage(opts.root);
}

export { SCHEMA_SQL, createSqliteRepo } from './repo/sqlite';
export { createLocalStorage } from './storage/local';
export { ingestPhoto } from './ingest/ingest';
export type { IngestInput, IngestResult } from './ingest/ingest';
export { ASSIGN_RADIUS_M, ASSIGN_WINDOW_H, assignPhoto } from './ingest/assign';
export type { AssignInput, AssignResult } from './ingest/assign';
export { readExif } from './ingest/exif';
export type { ExifSummary } from './ingest/exif';
export { processImage, sniffMime, THUMB_PX } from './ingest/image';
export { seedFixtures } from './seed/index';
export type { SeedOptions, SeedResult } from './seed/index';
export {
  FIXTURE_PHOTOS_DIR,
  fixturePhotoPath,
  generateDemoPhoto,
  loadOrGenerateDemoPhoto,
} from './seed/photos';
