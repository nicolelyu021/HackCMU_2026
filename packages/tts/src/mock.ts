import type { TTSProvider } from '@pinlog/schema';
import { estimateSpeechSeconds, silentWav } from './wav';

/** Silent WAV whose length is estimated from the text. Zero network, deterministic. */
export function createMockTTS(): TTSProvider {
  return {
    name: 'mock',
    async synthesize(req) {
      const duration_s = estimateSpeechSeconds(req.text) / (req.speed ?? 1);
      const audio = silentWav(duration_s, 8000); // small files: 16 KB per second
      return { audio, mime: 'audio/wav', duration_s: Math.round(duration_s * 1000) / 1000 };
    },
  };
}
