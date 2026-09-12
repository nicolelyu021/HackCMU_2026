import type { StorageProvider } from './ports/storage';

/** Map-backed StorageProvider for tests and the browser fixture mode. */
export function createMemoryStorage(): StorageProvider & { keys(): string[] } {
  const files = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    name: 'memory',
    async put(key, bytes, contentType) {
      files.set(key, { bytes, contentType });
    },
    async get(key) {
      return files.get(key)?.bytes ?? null;
    },
    async delete(key) {
      files.delete(key);
    },
    async exists(key) {
      return files.has(key);
    },
    async deletePrefix(prefix) {
      for (const k of [...files.keys()]) if (k.startsWith(prefix)) files.delete(k);
    },
    keys() {
      return [...files.keys()];
    },
  };
}
