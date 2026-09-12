/** Byte storage keyed by the layout in storage-keys.ts. Local disk today, Supabase Storage later. */
export interface StorageProvider {
  readonly name: string; // 'local' | 'memory'
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Delete everything under a prefix (trip deletion). */
  deletePrefix(prefix: string): Promise<void>;
}
