import type { LLMProvider } from './llm';
import type { PlacesProvider } from './places';
import type { Repo } from './repo';
import type { StorageProvider } from './storage';
import type { TTSProvider } from './tts';

export * from './llm';
export * from './places';
export * from './repo';
export * from './storage';
export * from './tts';

/** The full set of ports the API host wires up (services/api/src/container.ts). */
export interface Ports {
  repo: Repo;
  storage: StorageProvider;
  llm: LLMProvider;
  places: PlacesProvider;
  tts: TTSProvider;
}
