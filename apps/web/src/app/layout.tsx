import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pinlog — a map-first travel diary',
  description:
    'Plan a trip as pins on a map, live it by dropping photos and notes on those pins, relive it as a vlog.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
