// Owner D — public surface of @pinlog/tts. Signatures are part of the frozen contract; implementations are D's.
import type { TTSProvider } from '@pinlog/schema';

export type TTSKind = 'mock' | 'openai';
export interface TTSOptions {
  api_key?: string;
  model?: string;
}
export function createTTS(_kind: TTSKind, _opts: TTSOptions = {}): TTSProvider {
  throw new Error('TODO(D): createTTS not implemented');
}
/** 16-bit mono PCM WAV of silence (used by the mock adapter and the seed). */
export function silentWav(_duration_s: number, _sample_rate = 24000): Uint8Array {
  throw new Error('TODO(D): silentWav not implemented');
}
/** Duration in seconds read from a PCM WAV header. */
export function wavDuration(_bytes: Uint8Array): number {
  throw new Error('TODO(D): wavDuration not implemented');
}
