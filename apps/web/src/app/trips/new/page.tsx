'use client';
import Link from 'next/link';
import { ArtIcon, PencilArrow } from '@/components/ArtIcon';
import { useRouter } from 'next/navigation';
import { Dock } from '@/components/Dock';
import { NewTripForm } from '@/components/NewTripForm';
import { UserChip } from '@/components/UserChip';
import { useFixtureQuery } from '@/lib/hooks';

export default function NewTripPage() {
  const router = useRouter();
  const q = useFixtureQuery();
  return (
    <main className="new-trip-page">
      <header className="room-header">
        <Link href={`/${q}`} className="brand">
          <ArtIcon name="clover" size={38} />
          pinlog.
        </Link>
        <div className="shelf-header-right">
          <Link href={`/${q}`} className="hand-link">
            <PencilArrow back />
            Back to shelf
          </Link>
          <UserChip />
        </div>
      </header>
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
