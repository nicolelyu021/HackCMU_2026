import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import type { StorageProvider } from '@pinlog/schema';

/** Owner B. Files under `root`, one file per storage key (storage-keys.ts layout). */
export function createLocalStorage(root: string): StorageProvider {
  const base = resolve(root);
  const pathOf = (key: string) => {
    const clean = key.replace(/^\/+/, '');
    if (!clean || clean.split('/').some((seg) => seg === '..' || seg === '')) {
      throw new Error(`invalid storage key: ${key}`);
    }
    const p = resolve(base, clean);
    if (p !== base && !p.startsWith(base + sep))
      throw new Error(`storage key escapes root: ${key}`);
    return p;
  };
  return {
    name: 'local',
    async put(key, bytes) {
      const p = pathOf(key);
      await mkdir(dirname(p), { recursive: true });
      await writeFile(p, bytes);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(pathOf(key)));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
    },
    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
    async exists(key) {
      try {
        await stat(pathOf(key));
        return true;
      } catch {
        return false;
      }
    },
    async deletePrefix(prefix) {
      const p = pathOf(prefix.replace(/\/+$/, '') || '.');
      try {
        if ((await stat(p)).isDirectory()) {
          await rm(p, { recursive: true, force: true });
          return;
        }
      } catch {
        /* not a directory (or missing): fall through to a name-prefix scan */
      }
      const dir = dirname(p);
      const head = basename(p);
      let names: string[] = [];
      try {
        names = await readdir(dir);
      } catch {
        return;
      }
      await Promise.all(
        names
          .filter((n) => n.startsWith(head))
          .map((n) => rm(join(dir, n), { recursive: true, force: true })),
      );
    },
  };
}
