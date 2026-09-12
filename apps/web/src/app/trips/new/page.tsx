'use client';
import { useRouter } from 'next/navigation';
import { Dock } from '@/components/Dock';
import { NewTripForm } from '@/components/NewTripForm';
import { useFixtureQuery } from '@/lib/hooks';

export default function NewTripPage() {
  const router = useRouter();
  const q = useFixtureQuery();
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-paper">
      <div className="flex-1">
        <NewTripForm
          onCreated={(id, mustSee) => {
            const params = new URLSearchParams({ plan: '1' });
            if (mustSee) params.set('must_see', mustSee);
            router.push(`/trips/${id}?${params}${q ? '&fixture=1' : ''}`);
          }}
        />
      </div>
      <Dock active="shelf" />
    </main>
  );
}
