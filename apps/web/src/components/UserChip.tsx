'use client';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';

/** Header chip: the signed-in traveller's avatar, or the way in. The session comes from Auth0 Universal Login. */
export function UserChip() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <span className="traveller-chip is-loading" aria-hidden="true">
        <span className="traveller-avatar" />
      </span>
    );
  }

  if (!user) {
    return (
      <a href="/auth/login" className="pencil-button pencil-chip primary">
        Sign in
      </a>
    );
  }

  const label = user.name ?? user.nickname ?? user.email ?? 'Traveller';
  return (
    <span className="traveller-chip">
      <Link href="/profile" className="traveller-identity" title={`Signed in as ${label}`}>
        {user.picture ? (
          // Auth0 avatars come from many hosts; a plain <img> avoids adding each one to next.config remotePatterns.
          <img className="traveller-avatar" src={user.picture} alt="" width={26} height={26} />
        ) : (
          <span className="traveller-avatar traveller-initial">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="traveller-name">{label.split(' ')[0]}</span>
      </Link>
      <a href="/auth/logout" className="traveller-signout">
        sign out
      </a>
    </span>
  );
}
