import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Owner A. Auth0 is required: unlike the provider keys in .env.example there is no mock fallback here, so a missing
// variable stops the request with the message below instead of silently signing everyone in as a guest.
const REQUIRED = [
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_SECRET',
  'APP_BASE_URL',
] as const;

let client: Auth0Client | null = null;

/**
 * The shared Auth0 client, built on first use so `next build` does not need credentials.
 * Throws with the exact missing variables — see docs/AUTH.md for the `auth0 apps create` command that prints them.
 */
export function auth0(): Auth0Client {
  if (client) return client;

  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Auth0 is not configured: ${missing.join(', ')} missing from apps/web/.env.local. ` +
        `Run \`pnpm auth0:setup\` to create the application and print the values (docs/AUTH.md).`,
    );
  }
  // v4 wants the bare hostname; "https://tenant.auth0.com" fails later with an opaque discovery error.
  const domain = process.env.AUTH0_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '');

  client = new Auth0Client({
    domain,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    secret: process.env.AUTH0_SECRET!,
    appBaseUrl: process.env.APP_BASE_URL!,
    authorizationParameters: { scope: 'openid profile email' },
  });
  return client;
}
