import type { Language } from '../common';
import type { Voice } from '../script';

export interface TTSRequest {
  text: string;
  voice: Voice;
  language: Language;
  speed?: number;
}
export interface TTSResult {
  audio: Uint8Array;
  mime: 'audio/wav';
  /** Measured from the WAV header, never estimated (except by the mock). */
  duration_s: number;
}
export interface TTSProvider {
  readonly name: string; // 'mock' | 'openai'
  synthesize(req: TTSRequest): Promise<TTSResult>;
}
