import { NextResponse, type NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

// Owner A. Next 16's proxy convention (the old `middleware.ts` name still works). This mounts Auth0's
// /auth/login, /auth/logout, /auth/callback and /auth/profile routes and refreshes the session cookie.

/** Pages that need a signed-in user. Reading a trip stays public so a shared link still opens. */
const PROTECTED = [/^\/trips\/new/, /^\/profile/];

export async function proxy(request: NextRequest) {
  const authRes = await auth0().middleware(request);
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/auth/')) return authRes;
  if (!PROTECTED.some((re) => re.test(pathname))) return authRes;

  const session = await auth0().getSession(request);
  if (!session) {
    const returnTo = encodeURIComponent(`${pathname}${search}`);
    return NextResponse.redirect(new URL(`/auth/login?returnTo=${returnTo}`, request.url));
  }
  return authRes;
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the illustrations/fonts served straight from public/.
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|manifest.webmanifest|art/|icons/|fonts/|maplibre/|sitemap.xml|robots.txt).*)',
  ],
};
