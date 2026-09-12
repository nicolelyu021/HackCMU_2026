/** Frozen storage key layout (keys are stored in the db; URLs are built at read time with fileUrl). */
export const storageKeys = {
  media: (trip_id: string, media_id: string, ext: string) =>
    `trips/${trip_id}/media/${media_id}.${ext}`,
  thumb: (trip_id: string, media_id: string) => `trips/${trip_id}/thumbs/${media_id}.jpg`,
  segmentAudio: (vlog_id: string, index: number) =>
    `vlogs/${vlog_id}/seg_${String(index).padStart(2, '0')}.wav`,
  video: (vlog_id: string) => `vlogs/${vlog_id}/video.mp4`,
};

/** files_base_url is `${PINLOG_PUBLIC_URL}/files`; keys never start with a slash. */
export function fileUrl(files_base_url: string, key: string): string {
  return `${files_base_url.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
}

export function extensionOf(name_or_mime: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name_or_mime);
  if (m) return m[1]!.toLowerCase();
  if (name_or_mime.includes('/')) return name_or_mime.split('/')[1]!.replace('jpeg', 'jpg');
  return 'bin';
}

export function mimeForKey(key: string): string {
  const ext = extensionOf(key);
  const table: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    gif: 'image/gif',
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    json: 'application/json',
  };
  return table[ext] ?? 'application/octet-stream';
}
