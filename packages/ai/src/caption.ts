import type { Ports } from '@pinlog/schema';

export const CAPTION_SYSTEM =
  "Describe the photo in ONE sentence (max 20 words) stating only what is visible: subject, setting, light. No guesses about the place name, no people's names, no emotions.";

/** Owner C. Vision caption used by the vlog script (cut-list #2: fixtures carry hand-written captions). */
export async function caption(
  ports: Pick<Ports, 'llm'>,
  image: { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' | 'image/webp' },
): Promise<string> {
  const data_base64 = Buffer.from(image.bytes).toString('base64');
  const { text } = await ports.llm.complete({
    task: 'caption',
    system: CAPTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', media_type: image.mime, data_base64 },
          { type: 'text', text: 'Caption this travel photo.' },
        ],
      },
    ],
    effort: 'low',
    max_tokens: 160,
  });
  return text.trim().replace(/\s+/g, ' ');
}
