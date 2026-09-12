import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth0 } from '@/lib/auth0';

export const metadata = { title: 'Your traveller card — Pinlog' };

/**
 * Server-rendered from the Auth0 session cookie, never from anything the browser sent us.
 * proxy.ts already turns anonymous visitors away; the redirect here is the second lock.
 */
export default async function ProfilePage() {
  const session = await auth0().getSession();
  if (!session) redirect('/auth/login?returnTo=/profile');

  const { user } = session;
  const label = user.name ?? user.nickname ?? user.email ?? 'Traveller';
  const connection = typeof user.sub === 'string' ? user.sub.split('|')[0] : 'auth0';

  return (
    <main className="flex min-h-screen flex-col">
      <header className="room-header">
        <Link href="/" className="brand">
          <span>pinlog.</span>
        </Link>
        <Link href="/" className="hand-link">
          Back to shelf
        </Link>
      </header>
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <section className="paper-panel border border-line bg-card p-6">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img
                className="traveller-avatar"
                style={{ width: 62, height: 62 }}
                src={user.picture}
                alt=""
                width={62}
                height={62}
              />
            ) : (
              <span
                className="traveller-avatar traveller-initial"
                style={{ width: 62, height: 62, fontSize: 26 }}
              >
                {label.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl">{label}</h1>
              {user.email && <p className="truncate text-sm text-muted">{user.email}</p>}
            </div>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Signed in with</dt>
              <dd>{connection}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Email verified</dt>
              <dd>{user.email_verified ? 'yes' : 'not yet'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Auth0 user id</dt>
              <dd className="truncate font-mono text-xs">{user.sub}</dd>
            </div>
          </dl>

          <a href="/auth/logout" className="pencil-button mt-6 w-full">
            Sign out
          </a>
        </section>
        <p className="mt-4 text-center text-xs text-muted">
          Your trips stay on this device&apos;s Pinlog server. Auth0 only tells us who you are.
        </p>
      </div>
    </main>
  );
}
