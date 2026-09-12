// Owner D — public surface of @pinlog/tts. Signatures are part of the frozen contract (services/api/src/container.ts).
import type { TTSProvider } from '@pinlog/schema';
import { createMockTTS } from './mock';
import { createOpenAITTS } from './openai';

export { estimateSpeechSeconds, silentWav, wavDuration, wavInfo } from './wav';
export type { WavInfo } from './wav';
export { OPENAI_VOICES } from './voices';

export type TTSKind = 'mock' | 'openai';
export interface TTSOptions {
  api_key?: string;
  model?: string;
}

export function createTTS(kind: TTSKind, opts: TTSOptions = {}): TTSProvider {
  if (kind === 'mock') return createMockTTS();
  if (!opts.api_key) throw new Error('createTTS("openai") needs api_key (OPENAI_API_KEY)');
  return createOpenAITTS({ api_key: opts.api_key, model: opts.model });
}
