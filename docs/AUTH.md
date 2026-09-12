# Auth — Auth0 Universal Login

Owner A · branch `feat/auth0-login` · entered for MLH's **Best Use of Auth0** prize.

Pinlog signs travellers in with [Auth0 Universal Login](https://auth0.com/docs/authenticate/login/auth0-universal-login):
the browser leaves for the Auth0-hosted login page, comes back to `/auth/callback`, and the SDK keeps an encrypted
session cookie. Passwords never touch this repo, and neither does the `data/pinlog.db` user table — there isn't one.

Everything lives in `apps/web`. `packages/schema`, `services/api` and the SQLite rows are **unchanged**, so this is
additive to the other three owners' work — no `[contract]` PR needed.

## Setup (5 minutes, once per laptop)

```bash
brew install auth0     # the Auth0 CLI
auth0 login            # opens a browser; free signup at https://auth0.com/signup
pnpm auth0:setup       # creates the "Pinlog Web" app, writes apps/web/.env.local
pnpm dev
```

`pnpm auth0:setup` creates a **Regular Web Application** with the callback URLs already correct, then writes five
variables to `apps/web/.env.local` (git-ignored, mode 600). To reuse an application someone else made, run
`pnpm auth0:setup --app <client-id>`.

| Variable | What it is |
|---|---|
| `AUTH0_DOMAIN` | tenant hostname, **no `https://`** — `dev-abc123.us.auth0.com` |
| `AUTH0_CLIENT_ID` | the Pinlog Web application |
| `AUTH0_CLIENT_SECRET` | its secret — Next.js is a confidential client, not a SPA |
| `AUTH0_SECRET` | key that encrypts the session cookie (`openssl rand -hex 32`) |
| `APP_BASE_URL` | `http://localhost:3000`; must match the callback URL's origin |

They go in `apps/web/.env.local`, **not** the root `.env` — Next.js only reads its own app directory. The root
`.env` stays the API's (`PINLOG_MODE`, provider keys).

### Demoing from a phone

`APP_BASE_URL` must be the URL the phone actually opens. For `http://192.168.1.7:3000`, set that as `APP_BASE_URL`
and add `http://192.168.1.7:3000/auth/callback` to the app's Allowed Callback URLs:

```bash
auth0 apps update <client-id> \
  --callbacks "http://localhost:3000/auth/callback,http://192.168.1.7:3000/auth/callback" \
  --logout-urls "http://localhost:3000,http://192.168.1.7:3000"
```

## What exists

| Path | What |
|---|---|
| `apps/web/src/lib/auth0.ts` | the `Auth0Client`, built on first use; throws naming the missing variables |
| `apps/web/src/proxy.ts` | Next 16 proxy — mounts `/auth/*` and guards the protected pages |
| `apps/web/src/components/UserChip.tsx` | header avatar + sign out, or the way in |
| `apps/web/src/app/profile/page.tsx` | `/profile`, rendered from the session cookie server-side |
| `apps/web/src/app/layout.tsx` | `<Auth0Provider>` seeded with the server session |
| `scripts/auth0-setup.mjs` | `pnpm auth0:setup` |
| `scripts/auth0-branding.mjs` | `pnpm auth0:brand` — the Universal Login palette and copy |

Routes the SDK mounts for free: `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile` (JSON).
Note there is no `/api` prefix — that was v3.

## The login page wears Pinlog's colours

`pnpm auth0:brand` styles Auth0's hosted login page to match the shelf: paper background, cream widget,
`#796790` buttons, soft corners, and copy in Pinlog's voice ("Welcome back, traveller" → "Open my shelf").
`scripts/auth0-branding.mjs` **is** the config — edit `PALETTE` or `COPY` at the top and re-run. It is
idempotent: the first run creates the tenant's theme, later runs update it.

```bash
pnpm auth0:brand --dry-run   # print the theme, copy and contrast ratios, write nothing
pnpm auth0:brand             # apply to whichever tenant the Auth0 CLI is logged into
```

Because the branding lives in the repo rather than only in the dashboard, a teammate who runs
`auth0 login` against their own tenant gets the same login page with one command.

The script refuses to make the page unreadable quietly: it prints the WCAG contrast ratio for the button
label, body text and placeholders before writing (currently 5.05:1, 9.44:1 and 4.65:1 — all above the AA
threshold of 4.5:1).

**Deliberately asset-free.** Auth0 fetches logos and fonts from the public internet, so a demo on
`localhost` has nowhere to serve them from. Two consequences:

- The widget shows **no logo** (`logo_position: 'none'`). Left blank, Auth0 substitutes its own blue mark,
  and the PWA icon is a dark navy tile that fights the cream card — so the headline leads instead.
- The widget uses the **system font**, not Patrick Hand. To change that, host a WOFF on a CORS-enabled
  host and set `fonts.font_url`.

### What you cannot restyle

Rearranging the page — say, putting `travel-desk.png` in a panel beside the widget — needs a Liquid
**page template**, which requires a custom domain and therefore a paid plan. Same for ACUL (fully custom
screens). On the free tenant the widget can be recoloured and reworded, but not restructured.

## Who can see what

| Page | Needs sign-in |
|---|---|
| `/` the shelf | no |
| `/trips/[id]` a notebook | no — a shared link still opens |
| `/trips/new` | **yes** |
| `/profile` | **yes** |

The guard list is `PROTECTED` in `apps/web/src/proxy.ts`. Anonymous visitors are redirected to Auth0 with
`returnTo`, so after signing in they land exactly where they were going.

Reading a trip stays public on purpose: the demo opens straight onto the Pittsburgh notebook, and the vlog is
meant to be shareable. Signing in is what lets you *start* one.

## Auth0 is required here

Unlike every provider key in `.env.example`, Auth0 has **no mock fallback** — a missing variable fails the request
with the list of what's missing rather than quietly letting a guest in. That is deliberate (docs/DECISIONS.md,
2026-09-12 12:00): a judge should not be able to click past the login. It is also the one place Pinlog breaks
rule 3 in the README, so:

**Before any rehearsal, confirm `apps/web/.env.local` exists.** Without it every page returns a 500 whose message
is `Auth0 is not configured: … missing from apps/web/.env.local`.

### Making auth optional

If the team decides mid-hackathon that the demo must survive without credentials, edit
`apps/web/src/lib/auth0.ts`: return `null` instead of throwing when `missing.length > 0`, then have `proxy.ts`,
`layout.tsx` and `profile/page.tsx` treat `null` as "signed out". Roughly fifteen lines across four files.

## When it breaks

| Symptom | Cause |
|---|---|
| `Auth0 is not configured: …` | no `apps/web/.env.local` — run `pnpm auth0:setup` |
| Callback URL mismatch | `APP_BASE_URL` and the app's Allowed Callback URLs disagree (phone demo: see above) |
| Redirect loop, or "Invalid state" | stale cookie after changing `AUTH0_SECRET` — clear `localhost` cookies and restart |
| Login works, `/profile` 404s | `proxy.ts` was renamed; Next 16 only picks up `proxy.ts` or `middleware.ts` at `apps/web/src/` |
| `discovery failed` on sign-in | `AUTH0_DOMAIN` has `https://` on it; it wants the bare hostname |

## Not done

Per-user trip ownership. Trips have no `owner` field, so every signed-in traveller sees the same shelf — adding it
means a `[contract]` PR against `packages/schema` plus a migration in `packages/platform`, which would touch B's
and everyone's code. Sign-in proves *who you are*; it does not yet partition *what you see*.
