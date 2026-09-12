import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Why this exists: maplibre-gl 6 spawns a *module* web worker from a URL relative to its own JS chunk
// (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`). Under Next's bundler that URL resolves to a 404 HTML
// page, the worker dies silently, and the map never loads tiles or fires `load`. We serve the worker (and the
// shared chunk it imports) straight from the installed package, so the version can never drift, and
// `src/lib/maplibre.ts` points MapLibre here with `setWorkerUrl()`.

const ALLOWED = /^maplibre-gl-(worker|shared)(-dev)?\.mjs$/;
const CANDIDATE_ROOTS = [
  join(process.cwd(), 'node_modules'), // `next dev` runs in apps/web
  join(process.cwd(), '..', '..', 'node_modules'), // started from the repo root
];

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!ALLOWED.test(file)) return new Response('not found', { status: 404 });
  for (const root of CANDIDATE_ROOTS) {
    try {
      const body = await readFile(join(root, 'maplibre-gl', 'dist', file));
      return new Response(body, {
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    } catch {
      // try the next root
    }
  }
  return new Response('maplibre-gl not found', { status: 404 });
}
