'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Health, TripBundle } from '@pinlog/schema';
import { api, ApiClientError } from './api';

export function useHealth(): Health | null {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, []);
  return health;
}

/** The trip bundle + a refresh() every mutation calls. Optimistic edits patch the bundle in place. */
export function useBundle(tripId: string) {
  const [bundle, setBundle] = useState<TripBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const b = await api.getBundle(tripId);
      if (alive.current) {
        setBundle(b);
        setError(null);
      }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : String(err));
    }
  }, [tripId]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  return { bundle, setBundle, refresh, error };
}

/** Tiny toast queue. */
export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  title: string;
  detail?: string;
}
export function useToasts(ttlMs = 5000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((xs) => [...xs, { ...t, id }]);
      setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), ttlMs);
    },
    [ttlMs],
  );
  const pushError = useCallback(
    (err: unknown, title = 'Something went wrong') =>
      push({
        kind: 'error',
        title,
        detail:
          err instanceof ApiClientError
            ? `${err.code}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err),
      }),
    [push],
  );
  return { toasts, push, pushError };
}

/** True when the media query matches (false during SSR and the first paint). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
