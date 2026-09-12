import type { Voice } from '@pinlog/schema';

/** Pinlog voice → OpenAI voice name (docs/DECISIONS.md: one voice, English; nova vs shimmer open). */
export const OPENAI_VOICES: Record<Voice, string> = {
  warm_female: 'nova',
  calm_male: 'onyx',
  bright_female: 'shimmer',
};
