import type { CSSProperties } from 'react';

export type ArtIconName =
  'shelf' | 'map' | 'scrapbook' | 'journal' | 'vlog' | 'camera' | 'satchel' | 'clover' | 'photos';
const positions: Record<ArtIconName, [number, number]> = {
  shelf: [0, 0],
  map: [1, 0],
  scrapbook: [2, 0],
  journal: [0, 1],
  vlog: [1, 1],
  camera: [2, 1],
  satchel: [0, 2],
  clover: [1, 2],
  photos: [2, 2],
};

/** Original pencil illustrations, displayed from one locally stored atlas. */
export function ArtIcon({
  name,
  size = 40,
  className = '',
}: {
  name: ArtIconName;
  size?: number;
  className?: string;
}) {
  const [x, y] = positions[name];
  return (
    <span
      aria-hidden="true"
      className={`art-icon ${className}`}
      style={
        {
          width: size,
          height: size,
          backgroundPosition: `${x * 50}% ${y * 50}%`,
        } as CSSProperties
      }
    />
  );
}

export function PencilArrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 20"
      width="28"
      height="18"
      fill="none"
      className={back ? 'rotate-180' : ''}
    >
      <path
        d="M3 10.5Q15 9 28 10M21 3l7.5 7-8 6.5M4 12l22-1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
