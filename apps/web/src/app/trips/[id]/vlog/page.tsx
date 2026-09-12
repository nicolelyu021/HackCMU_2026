'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isFixtureMode } from '@/lib/config';

/** Vlog lives in the trip room now (`?panel=vlog`). */
export default function VlogRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    const q = isFixtureMode() ? '&fixture=1' : '';
    router.replace(`/trips/${id}?panel=vlog${q}`);
  }, [id, router]);
  return (
    <div className="flex h-dvh items-center justify-center bg-paper text-sm text-muted">
      Opening vlog…
    </div>
  );
}
