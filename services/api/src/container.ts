import { join } from 'node:path';
import { createLLM, createPlaces } from '@pinlog/ai';
import { createRepo, createStorage } from '@pinlog/platform';
import type { Ports } from '@pinlog/schema';
import { createTTS } from '@pinlog/tts';
import { dataDir, type Env } from './env';

export const VERSION = '0.1.0';

/** Everything a route needs, built once at boot (or per test). */
export interface Container {
  env: Env;
  ports: Ports;
  /** 'live' if any provider is live. */
  mode: 'mock' | 'live';
  providers: { llm: string; places: string; tts: string };
  files_base_url: string;
  map_style_url: string;
  data_dir: string;
  version: string;
}

function choose<K extends string>(
  label: string,
  explicit: K | undefined,
  liveKind: K,
  mode: 'mock' | 'live',
  hasKey: boolean,
): K | 'mock' {
  const wanted: K | 'mock' = explicit ?? (mode === 'live' ? liveKind : 'mock');
  if (wanted !== 'mock' && !hasKey) {
    console.warn(
      `[pinlog] ${label}=${wanted} requested but its API key is missing → falling back to mock`,
    );
    return 'mock';
  }
  return wanted;
}

/**
 * Adapter selection. Owners only touch their own factory (createRepo/createStorage → B, createLLM/createPlaces → C,
 * createTTS → D). Tests pass explicit ports in `overrides` and never read the environment.
 */
export function createContainer(env: Env, overrides: Partial<Ports> = {}): Container {
  const dir = dataDir(env);
  const llmKind = choose('PINLOG_LLM', env.PINLOG_LLM, 'anthropic', env.PINLOG_MODE, !!env.ANTHROPIC_API_KEY);
  const placesKind = choose('PINLOG_PLACES', env.PINLOG_PLACES, 'nominatim', env.PINLOG_MODE, true);
  const ttsKind = choose('PINLOG_TTS', env.PINLOG_TTS, 'openai', env.PINLOG_MODE, !!env.OPENAI_API_KEY);

  const ports: Ports = {
    repo: overrides.repo ?? createRepo({ path: env.PINLOG_DB_PATH ?? join(dir, 'pinlog.db') }),
    storage: overrides.storage ?? createStorage({ kind: 'local', root: join(dir, 'files') }),
    llm:
      overrides.llm ??
      createLLM(llmKind, {
        api_key: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
        replay: env.PINLOG_LLM_REPLAY,
        replay_dir: join(dir, 'replays'),
      }),
    places: overrides.places ?? createPlaces(placesKind, { email: env.NOMINATIM_EMAIL }),
    tts: overrides.tts ?? createTTS(ttsKind, { api_key: env.OPENAI_API_KEY, model: env.OPENAI_TTS_MODEL }),
  };
  const providers = { llm: ports.llm.name, places: ports.places.name, tts: ports.tts.name };
  const mode = Object.values(providers).some((n) => n !== 'mock') ? 'live' : 'mock';
  return {
    env,
    ports,
    mode,
    providers,
    files_base_url: `${env.PINLOG_PUBLIC_URL.replace(/\/+$/, '')}/files`,
    map_style_url: env.PINLOG_MAP_STYLE,
    data_dir: dir,
    version: VERSION,
  };
}
