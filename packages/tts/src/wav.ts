// PCM WAV helpers. 16-bit mono little-endian; the duration is always read from the header, never estimated.

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** 16-bit mono PCM WAV of silence. */
export function silentWav(duration_s: number, sample_rate = 24000): Uint8Array {
  const frames = Math.max(1, Math.round(duration_s * sample_rate));
  const dataSize = frames * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  bytes.set(ascii('RIFF'), 0);
  view.setUint32(4, 36 + dataSize, true);
  bytes.set(ascii('WAVE'), 8);
  bytes.set(ascii('fmt '), 12);
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sample_rate, true);
  view.setUint32(28, sample_rate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  bytes.set(ascii('data'), 36);
  view.setUint32(40, dataSize, true);
  return bytes;
}

export interface WavInfo {
  sample_rate: number;
  channels: number;
  bits_per_sample: number;
  data_offset: number;
  data_size: number;
  duration_s: number;
}

/**
 * Parse a RIFF/WAVE header. Chunks may come in any order (LIST, fact…). A streamed WAV (OpenAI) may carry a
 * placeholder data size (0 or 0xFFFFFFFF); in that case the data runs to the end of the buffer.
 */
export function wavInfo(bytes: Uint8Array): WavInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) =>
    String.fromCharCode(bytes[o]!, bytes[o + 1]!, bytes[o + 2]!, bytes[o + 3]!);
  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  let fmt: { sample_rate: number; channels: number; bits_per_sample: number } | null = null;
  let data: { offset: number; size: number } | null = null;
  let o = 12;
  while (o + 8 <= bytes.byteLength) {
    const id = tag(o);
    const size = view.getUint32(o + 4, true);
    const body = o + 8;
    if (id === 'fmt ') {
      fmt = {
        channels: view.getUint16(body + 2, true),
        sample_rate: view.getUint32(body + 4, true),
        bits_per_sample: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      const remaining = bytes.byteLength - body;
      const real = size === 0 || size === 0xffffffff || size > remaining ? remaining : size;
      data = { offset: body, size: real };
      break; // data is last in practice; nothing after it matters for duration
    }
    o = body + size + (size % 2); // chunks are word-aligned
  }
  if (!fmt) throw new Error('WAV has no fmt chunk');
  if (!data) throw new Error('WAV has no data chunk');
  const bytesPerSecond = (fmt.sample_rate * fmt.channels * fmt.bits_per_sample) / 8;
  return {
    ...fmt,
    data_offset: data.offset,
    data_size: data.size,
    duration_s: bytesPerSecond > 0 ? data.size / bytesPerSecond : 0,
  };
}

/** Duration in seconds read from a PCM WAV header. */
export function wavDuration(bytes: Uint8Array): number {
  return Math.round(wavInfo(bytes).duration_s * 1000) / 1000;
}

/** Rough narration length for text without audio (mock TTS, fallbacks): ~2.6 words/s, ≥ 1 s. */
export function estimateSpeechSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length; // Chinese: ~4 characters/s
  return Math.max(1, Math.round((words / 2.6 + cjk / 4) * 10) / 10);
}
