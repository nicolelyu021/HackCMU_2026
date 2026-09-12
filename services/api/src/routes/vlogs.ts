import { Hono } from 'hono';
import {
  CreateVlogInput,
  RegenerateVlogInput,
  UpdateScriptInput,
  type VlogsResponse,
} from '@pinlog/schema';
import { conflict, notFound } from '../errors';
import { isVlogJobRunning, runVlogPipeline } from '../jobs/vlog-pipeline';
import { validate } from '../lib/validate';
import type { AppEnv } from '../types';

/**
 * Owner D. POST /trips/:id/vlog (202 + in-process job), GET /vlogs/:id, GET /trips/:id/vlogs,
 * POST /vlogs/:id/regenerate, PUT /vlogs/:id/script (re-runs TTS), POST /vlogs/:id/render (MP4 stretch).
 * Tests may await the job: set c.env / query `?wait=1`.
 */
export const vlogsRoutes = new Hono<AppEnv>();

const fire = (p: Promise<unknown>) => void p.catch((err) => console.error('[vlog job]', err));

vlogsRoutes.post('/trips/:id/vlog', validate('json', CreateVlogInput), async (c) => {
  const { ports } = c.get('container');
  const trip_id = c.req.param('id');
  if (!(await ports.repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  if (isVlogJobRunning(trip_id)) throw conflict('A vlog is already being generated for this trip');
  const vlog = await ports.repo.vlogs.create({ trip_id, settings: c.req.valid('json') });
  const job = runVlogPipeline(ports, vlog);
  if (c.req.query('wait') === '1') return c.json(await job, 202);
  fire(job);
  return c.json(vlog, 202);
});

vlogsRoutes.get('/vlogs/:id', async (c) => {
  const vlog = await c.get('container').ports.repo.vlogs.get(c.req.param('id'));
  if (!vlog) throw notFound('vlog', c.req.param('id'));
  return c.json(vlog);
});

vlogsRoutes.get('/trips/:id/vlogs', async (c) => {
  const { ports } = c.get('container');
  const trip_id = c.req.param('id');
  if (!(await ports.repo.trips.get(trip_id))) throw notFound('trip', trip_id);
  const body: VlogsResponse = { vlogs: await ports.repo.vlogs.listByTrip(trip_id) };
  return c.json(body);
});

vlogsRoutes.post('/vlogs/:id/regenerate', validate('json', RegenerateVlogInput), async (c) => {
  const { ports } = c.get('container');
  const prev = await ports.repo.vlogs.get(c.req.param('id'));
  if (!prev) throw notFound('vlog', c.req.param('id'));
  if (isVlogJobRunning(prev.trip_id))
    throw conflict('A vlog is already being generated for this trip');
  const settings = { ...prev.settings, instructions: c.req.valid('json').instructions };
  const vlog = await ports.repo.vlogs.create({ trip_id: prev.trip_id, settings });
  const job = runVlogPipeline(ports, vlog, { previous: prev.script });
  if (c.req.query('wait') === '1') return c.json(await job, 202);
  fire(job);
  return c.json(vlog, 202);
});

vlogsRoutes.put('/vlogs/:id/script', validate('json', UpdateScriptInput), async (c) => {
  const { ports } = c.get('container');
  const prev = await ports.repo.vlogs.get(c.req.param('id'));
  if (!prev) throw notFound('vlog', c.req.param('id'));
  if (isVlogJobRunning(prev.trip_id))
    throw conflict('A vlog is already being generated for this trip');
  const script = c.req.valid('json').script;
  const queued = await ports.repo.vlogs.update(prev.id, { status: 'queued', script, error: null });
  const job = runVlogPipeline(ports, queued, { script });
  if (c.req.query('wait') === '1') return c.json(await job, 202);
  fire(job);
  return c.json(queued, 202);
});

vlogsRoutes.post('/vlogs/:id/render', async (c) => {
  const { ports } = c.get('container');
  const vlog = await ports.repo.vlogs.get(c.req.param('id'));
  if (!vlog) throw notFound('vlog', c.req.param('id'));
  // Stretch (docs/PLAN.md D4): MP4 export runs from the CLI — `pnpm render -- --vlog <id>`. The route just reports.
  return c.json(
    {
      ...vlog,
      error: vlog.video_path
        ? vlog.error
        : 'MP4 export is a CLI step in this build: pnpm render -- --vlog ' + vlog.id,
    },
    202,
  );
});
