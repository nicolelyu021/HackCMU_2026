import type { Metadata } from 'next';
import { Auth0Provider } from '@auth0/nextjs-auth0/client';
import { auth0 } from '@/lib/auth0';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pinlog — a map-first travel diary',
  description:
    'Plan a trip as pins on a map, live it by dropping photos and notes on those pins, relive it as a vlog.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Seeds useUser() with the session we already have, so the header never flashes "Sign in" for a signed-in traveller.
  const session = await auth0().getSession();

  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <Auth0Provider user={session?.user}>{children}</Auth0Provider>
      </body>
    </html>
  );
}
