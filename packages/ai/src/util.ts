/** Sentence split that keeps the punctuation (handles . ! ? and CJK 。！？). */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?。！？]+[.!?。！？]+["'”’)]?|[^.!?。！？]+$/g;
  for (const m of text.trim().matchAll(re)) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

export function firstSentences(text: string, n: number): string {
  return splitSentences(text).slice(0, n).join(' ').trim();
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Same formula as @pinlog/tts estimateSpeechSeconds (duplicated on purpose: ai must not depend on tts). */
export function estimateSpeechSeconds(text: string): number {
  const words = wordCount(text);
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length;
  return Math.max(1, Math.round((words / 2.6 + cjk / 4) * 10) / 10);
}

/** Lowercase, strip diacritics and punctuation, collapse spaces — for fuzzy place-name matching. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9㐀-鿿]+/g, ' ')
    .trim();
}

export const STOPWORDS = new Set([
  'the',
  'of',
  'and',
  'at',
  'in',
  'a',
  'an',
  'to',
  'de',
  'la',
  'le',
]);

export function tokens(s: string): string[] {
  return normalizeName(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

export const clockOf = (naive: string | null | undefined) => (naive ? naive.slice(11, 16) : null);
