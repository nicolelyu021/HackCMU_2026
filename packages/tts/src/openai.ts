import OpenAI from 'openai';
import type { TTSProvider } from '@pinlog/schema';
import { OPENAI_VOICES } from './voices';
import { wavDuration } from './wav';

export interface OpenAITTSOptions {
  api_key: string;
  /** Default gpt-4o-mini-tts (supports `instructions`). */
  model?: string;
}

/** OpenAI text-to-speech → WAV. The duration is measured from the returned header. */
export function createOpenAITTS(opts: OpenAITTSOptions): TTSProvider {
  const client = new OpenAI({ apiKey: opts.api_key });
  const model = opts.model ?? 'gpt-4o-mini-tts';
  return {
    name: 'openai',
    async synthesize(req) {
      const res = await client.audio.speech.create({
        model,
        voice: OPENAI_VOICES[req.voice],
        input: req.text,
        response_format: 'wav',
        speed: req.speed,
        // Only gpt-4o-mini-tts reads instructions; other models ignore the field.
        instructions:
          req.language === 'zh'
            ? 'Narrate a personal travel vlog in natural Mandarin Chinese: warm, unhurried, first person.'
            : 'Narrate a personal travel vlog: warm, unhurried, first person, like telling a friend about your day.',
      });
      const audio = new Uint8Array(await res.arrayBuffer());
      return { audio, mime: 'audio/wav', duration_s: wavDuration(audio) };
    },
  };
}
