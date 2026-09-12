'use client';
import { useParams } from 'next/navigation';
import { VlogStudio } from '@/components/vlog/VlogStudio';

export default function VlogPage() {
  const { id } = useParams<{ id: string }>();
  return <VlogStudio tripId={id} />;
}
