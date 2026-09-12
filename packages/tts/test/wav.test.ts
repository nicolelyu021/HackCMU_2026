import { describe, expect, it } from 'vitest';
import { createTTS, estimateSpeechSeconds, silentWav, wavDuration, wavInfo } from '../src/index';

describe('wav helpers', () => {
  it('writes a header that reads back with the same duration', () => {
    const wav = silentWav(2.5);
    expect(wav.byteLength).toBe(44 + 2.5 * 24000 * 2);
    const info = wavInfo(wav);
    expect(info).toMatchObject({ sample_rate: 24000, channels: 1, bits_per_sample: 16 });
    expect(wavDuration(wav)).toBe(2.5);
  });

  it('tolerates a streamed WAV with a placeholder data size and extra chunks', () => {
    const wav = silentWav(1, 8000);
    const view = new DataView(wav.buffer);
    view.setUint32(40, 0xffffffff, true); // OpenAI-style placeholder
    expect(wavDuration(wav)).toBe(1);
    // insert a LIST chunk before data
    const list = new Uint8Array([...'LIST'].map((c) => c.charCodeAt(0)));
    const size = new Uint8Array(4);
    new DataView(size.buffer).setUint32(0, 4, true);
    const withList = new Uint8Array([
      ...wav.subarray(0, 36),
      ...list,
      ...size,
      1,
      2,
      3,
      4,
      ...wav.subarray(36),
    ]);
    expect(wavDuration(withList)).toBe(1);
  });

  it('rejects non-WAV bytes', () => {
    expect(() => wavDuration(new Uint8Array([1, 2, 3]))).toThrow(/RIFF/);
  });

  it('estimates speech length from words', () => {
    expect(
      estimateSpeechSeconds(
        'one two three four five six seven eight nine ten eleven twelve thirteen',
      ),
    ).toBeCloseTo(5, 0);
    expect(estimateSpeechSeconds('')).toBe(1);
  });
});

describe('mock tts', () => {
  it('returns a parseable WAV whose measured duration matches the reported one', async () => {
    const tts = createTTS('mock');
    const res = await tts.synthesize({
      text: 'We started at the Cathedral of Learning and rode the elevator to the 36th floor.',
      voice: 'warm_female',
      language: 'en',
    });
    expect(res.mime).toBe('audio/wav');
    expect(wavDuration(res.audio)).toBeCloseTo(res.duration_s, 2);
    expect(res.duration_s).toBeGreaterThan(3);
  });
  it('openai needs a key', () => {
    expect(() => createTTS('openai')).toThrow(/api_key/);
    expect(createTTS('openai', { api_key: 'sk-test' }).name).toBe('openai');
  });
});
