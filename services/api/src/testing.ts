import { createLLM, createPlaces } from '@pinlog/ai';
import { createRepo, createStorage, seedFixtures } from '@pinlog/platform';
import type { Ports } from '@pinlog/schema';
import { createTTS } from '@pinlog/tts';
import { createApp } from './app';
import { createContainer, type Container } from './container';
import { loadEnv } from './env';

/** In-memory sqlite + memory storage + mock providers with zero delays. Never reads process.env. */
export function createTestContainer(overrides: Partial<Ports> = {}): Container {
  const env = loadEnv({ PINLOG_MODE: 'mock' });
  return createContainer(env, {
    repo: overrides.repo ?? createRepo({ path: ':memory:' }),
    storage: overrides.storage ?? createStorage({ kind: 'memory' }),
    llm: overrides.llm ?? createLLM('mock', { mock_delay_ms: 0 }),
    places: overrides.places ?? createPlaces('mock'),
    tts: overrides.tts ?? createTTS('mock'),
  });
}

/** A quiet app over a freshly seeded in-memory database (no photo files, rows only). */
export async function seededTestApp(overrides: Partial<Ports> = {}) {
  const container = createTestContainer(overrides);
  await seedFixtures(container.ports, { photos: 'skip', log: () => {} });
  return { app: createApp(container, { quiet: true }), container };
}

/** Ports whose every method throws — for tests that must not touch data (health, 404s). */
export function fakePorts(): Ports {
  const boom = (what: string) =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'name'
            ? 'mock'
            : () => {
                throw new Error(`${what}.${String(prop)} is not available in this test`);
              },
      },
    );
  return {
    repo: boom('repo') as unknown as Ports['repo'],
    storage: boom('storage') as unknown as Ports['storage'],
    llm: boom('llm') as unknown as Ports['llm'],
    places: boom('places') as unknown as Ports['places'],
    tts: boom('tts') as unknown as Ports['tts'],
  };
}
