import { resolve } from 'node:path';
import { z } from 'zod';

/** Validated process environment. Every value has a default so mock mode needs no .env at all. */
export const EnvSchema = z.object({
  PINLOG_MODE: z.enum(['mock', 'live']).default('mock'),
  PINLOG_LLM: z.enum(['mock', 'anthropic']).optional(),
  PINLOG_PLACES: z.enum(['mock', 'nominatim']).optional(),
  PINLOG_TTS: z.enum(['mock', 'openai']).optional(),
  PINLOG_LLM_REPLAY: z.enum(['off', 'record', 'replay']).default('off'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_TTS_MODEL: z.string().default('gpt-4o-mini-tts'),
  NOMINATIM_EMAIL: z.string().optional(),
  PINLOG_API_PORT: z.coerce.number().int().positive().default(8787),
  PINLOG_PUBLIC_URL: z.string().default('http://localhost:8787'),
  PINLOG_WEB_ORIGIN: z.string().default('http://localhost:3000'),
  PINLOG_DATA_DIR: z.string().optional(),
  PINLOG_DB_PATH: z.string().optional(),
  PINLOG_MAP_STYLE: z.string().default('https://tiles.openfreemap.org/styles/liberty'),
});
export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const picked: Record<string, string> = {};
  for (const key of Object.keys(EnvSchema.shape)) {
    const v = source[key];
    if (v !== undefined && v !== '') picked[key] = v;
  }
  return EnvSchema.parse(picked);
}

/** Repo root, resolved from this file so it never depends on cwd. */
export const REPO_ROOT = resolve(import.meta.dirname, '../../..');

export function dataDir(env: Env): string {
  return env.PINLOG_DATA_DIR ? resolve(env.PINLOG_DATA_DIR) : resolve(REPO_ROOT, 'data');
}
