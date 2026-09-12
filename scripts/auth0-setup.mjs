// Creates (or reuses) the Auth0 application for the web app and writes apps/web/.env.local (docs/AUTH.md).
// Run by `pnpm auth0:setup`. Needs the Auth0 CLI: `brew install auth0 && auth0 login`.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = resolve(ROOT, 'apps/web/.env.local');
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

const die = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

/** Runs the Auth0 CLI and returns stdout. Stderr is inherited so `auth0 login` can talk to the user. */
function auth0(args, { capture = true } = {}) {
  try {
    return execFileSync('auth0', args, {
      encoding: 'utf8',
      stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    });
  } catch (err) {
    if (err.code === 'ENOENT') die('Auth0 CLI not found. Install it with `brew install auth0`.');
    return null;
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (await rl.question(q)).trim();

// 1. Signed in?
const tenants = auth0(['tenants', 'list', '--json']);
if (!tenants) {
  die(
    'Not signed in to Auth0. Run `auth0 login` (sign up free at https://auth0.com/signup), then retry.',
  );
}

// 2. Create or reuse the application.
let clientId = process.argv.includes('--app')
  ? process.argv[process.argv.indexOf('--app') + 1]
  : null;

if (!clientId) {
  console.log('\nExisting applications:');
  auth0(['apps', 'list'], { capture: false });
  clientId = await ask('\nClient ID to reuse (blank = create a new "Pinlog Web" app): ');
}

if (!clientId) {
  const created = auth0([
    'apps',
    'create',
    '--name',
    'Pinlog Web',
    '--description',
    'Pinlog — map-first travel diary (HackCMU 2026)',
    '--type',
    'regular',
    '--callbacks',
    `${BASE_URL}/auth/callback`,
    '--logout-urls',
    BASE_URL,
    '--origins',
    BASE_URL,
    '--json',
  ]);
  if (!created) die('`auth0 apps create` failed — see the error above.');
  clientId = JSON.parse(created).client_id;
  console.log(`\n✓ Created application ${clientId}`);
}

// 3. Read the credentials back. --reveal-secrets is what returns client_secret.
const shown = auth0(['apps', 'show', clientId, '--reveal-secrets', '--json']);
if (!shown) die(`Could not read application ${clientId}.`);
const app = JSON.parse(shown);

/** `apps show` usually carries the tenant domain; older CLI builds only expose it on the tenant list. */
function tenantDomain() {
  if (app.domain) return app.domain;
  const list = JSON.parse(tenants);
  const active = (Array.isArray(list) ? list : (list.tenants ?? [])).find((t) => t.active);
  return active?.domain ?? active?.name ?? '';
}

const domain = tenantDomain()
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');
const clientSecret = app.client_secret ?? 'PASTE_CLIENT_SECRET_FROM_AUTH0_DASHBOARD';
if (!domain) die('Could not determine the tenant domain — check `auth0 tenants list`.');

// 4. Write apps/web/.env.local, keeping anything already in it.
if (existsSync(ENV_FILE)) {
  const current = readFileSync(ENV_FILE, 'utf8');
  if (/^\s*AUTH0_CLIENT_ID=/m.test(current)) {
    const go = await ask(`\n${ENV_FILE} already has Auth0 values. Replace them? [y/N] `);
    if (go.toLowerCase() !== 'y') {
      rl.close();
      die('Left the existing file alone.');
    }
  }
}

const keep = existsSync(ENV_FILE)
  ? readFileSync(ENV_FILE, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(AUTH0_[A-Z_]+|APP_BASE_URL)=/.test(l))
      .join('\n')
      .trimEnd()
  : '';

writeFileSync(
  ENV_FILE,
  `${keep ? `${keep}\n\n` : ''}# Auth0 — written by \`pnpm auth0:setup\`. Never commit this file.
AUTH0_DOMAIN=${domain}
AUTH0_CLIENT_ID=${clientId}
AUTH0_CLIENT_SECRET=${clientSecret}
AUTH0_SECRET=${randomBytes(32).toString('hex')}
APP_BASE_URL=${BASE_URL}
`,
  { mode: 0o600 },
);

rl.close();
console.log(`\n✓ Wrote ${ENV_FILE}`);
console.log(`  tenant:    ${domain}`);
console.log(`  client id: ${clientId}`);
if (clientSecret.startsWith('PASTE_')) {
  console.log('\n! The CLI did not return the client secret. Copy it from the Auth0 dashboard');
  console.log('  (Applications → Pinlog Web → Settings) into AUTH0_CLIENT_SECRET.');
}
console.log('\nNext: pnpm dev, then open http://localhost:3000 and press Sign in.\n');
