import { Hono } from 'hono';
import { mimeForKey } from '@pinlog/schema';
import type { AppEnv } from '../types';

/**
 * Owner B. GET /files/<storage key> — serves originals, thumbs, wav, mp4 through the StorageProvider
 * (storage-agnostic: works with memory storage in tests and can become a redirect for Supabase).
 * Supports single byte ranges so <audio>/<video> can seek.
 */
export const filesRoutes = new Hono<AppEnv>();

filesRoutes.get('/files/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/files\/?/, ''));
  if (!key || key.includes('..')) return c.notFound();
  const bytes = await c.get('container').ports.storage.get(key);
  if (!bytes) return c.notFound();

  const mime = mimeForKey(key);
  const total = bytes.byteLength;
  const headers: Record<string, string> = {
    'content-type': mime,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
  };
  const range = c.req.header('range');
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    if (start >= total || start > end) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
    }
    const slice = bytes.subarray(start, end + 1);
    return new Response(Buffer.from(slice), {
      status: 206,
      headers: {
        ...headers,
        'content-range': `bytes ${start}-${end}/${total}`,
        'content-length': String(slice.byteLength),
      },
    });
  }
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: { ...headers, 'content-length': String(total) },
  });
});
