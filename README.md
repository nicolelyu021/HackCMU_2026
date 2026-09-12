# Pinlog — a map-first travel diary (HackCMU 2026)

Plan a trip as pins on a map, live it by dropping photos and notes onto those pins, then relive it as an
auto-generated vlog. **Everything is a pin.**

```
plan  ──►  pins on a map  ──►  photos auto-land on pins (EXIF)  ──►  one-tap vlog  ──►  share
```

**New here? Start with [docs/HANDOFF.md](docs/HANDOFF.md)** — what exists, how to verify it, and the next step for each owner.

## Start the hackathon demo (Auth0 is the only key you need)

Run every command below from the repository root (the folder containing `pnpm-workspace.yaml`). Use **Node.js 24+** and **pnpm 10.15.0**.

```bash
node --version
npm install -g pnpm@10.15.0          # once, if pnpm is not installed
pnpm install --frozen-lockfile
pnpm seed                            # creates demo data; leaves an existing seed alone

brew install auth0 && auth0 login    # once per laptop — free signup at auth0.com/signup
pnpm auth0:setup                     # writes apps/web/.env.local

pnpm dev                             # leave this terminal running
```

Signing in is the one thing that needs credentials: the web app **will not serve a page** without
`apps/web/.env.local`, by decision, so a judge cannot click past the login. Full setup and troubleshooting in
[docs/AUTH.md](docs/AUTH.md). Everything else (planner, captions, narration) still runs keyless in mock mode.

Wait for the API to listen on **8787** and Next.js to report ready on **3000**. Open:

- Shelf: http://localhost:3000
- Pittsburgh demo: http://localhost:3000/trips/trip_pgh
- API health: http://localhost:8787/health

The demo has 9 stops, 18 placeholder photos, 7 notes and a prepared film. The map opens as a **local pencil route sketch with clickable real stops**; it does not wait for street tiles or start WebGL. The **Street map** button switches to the online OpenFreeMap basemap (needs internet; the page returns to the sketch only if the map never loads within 8 s). Select **All** in the day filter to show every stop. Try a pin → Scrapbook → Journal → Little film for a quick walkthrough. Mock narration is silent.

Beyond `apps/web/.env.local` above, no `.env` is needed on a fresh checkout. If you already have one, set `PINLOG_MODE=mock` and remove any live per-provider overrides for a no-key demo. Data and uploads persist in `data/`; restarting does not erase them. Stop the app with **Ctrl+C**. On subsequent runs, just run `pnpm dev`.

To run each server in its own terminal:

```bash
# Terminal 1, repository root
pnpm --filter @pinlog/api start
```

```bash
# Terminal 2, repository root
pnpm dev:web
```

Do not also run `pnpm dev` when these two servers are already running.

### If startup fails

- **Every page 500s with `Auth0 is not configured`:** `apps/web/.env.local` is missing — run `pnpm auth0:setup` ([docs/AUTH.md](docs/AUTH.md)).
- **Port already in use:** stop the previous server terminal with Ctrl+C, then retry. Keep web on 3000 and API on 8787 for the links above.
- **Missing demo trip:** run `pnpm seed`, then reload. Only use `pnpm seed:reset --start YYYY-MM-DD` when you intend to replace the seeded demo trip; the date is the trip's first day. Back up `data/` before resetting a customized demo.
- **Next.js hangs before Ready, or reports `patchErrorInspectNodeJS is not a function`:** this occurred on the development laptop and remains unresolved. Stop the stuck process, use Node 24 LTS, run `pnpm install --frozen-lockfile --force`, then retry `pnpm dev:web`. This is a recovery attempt, not a verified fix. It does not require deleting `data/`.
- **API unavailable but Next.js works:** http://localhost:3000/trips/trip_pgh?fixture=1 provides a read-only fixture view; edits and uploads need the API.
- **Need an emergency demo without either server:** open [docs/preview.html](docs/preview.html) directly in a browser. This is the older standalone prototype, not the new illustrated frontend. Rebuild it with `pnpm preview` after fixture changes.

For a phone, connect to the laptop's Wi-Fi and open `http://<laptop-LAN-IP>:3000`. Both server ports must be reachable from the phone. The frontend derives the API host from the page URL. On iOS use Share → **Add to Home Screen** for the full-screen PWA. For photos to land on pins, shoot JPEG (Camera → Formats → Most Compatible) and keep **Location** on when picking from the camera roll; otherwise the EXIF GPS is stripped and the photo waits in the tray.

### Verification and handoff

See [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) for the latest design changes, artwork attribution and verification status, and [docs/HANDOFF.md](docs/HANDOFF.md) §0 for the latest verified state (typecheck, 69 tests, lint, `next build` with Turbopack — all green on the demo laptop on 09-12).

```bash
pnpm test
pnpm typecheck
pnpm --filter @pinlog/web build              # Turbopack (default); `next build --webpack` also works
```

`pnpm smoke` **mutates the seeded demo**, including chat/planning content. Run it against a separate seeded data directory/API, not the presentation database. It is not required to start the app.

For live providers, copy `.env.example` to `.env`, add your own keys, set `PINLOG_MODE=live`, and restart. Frontend overrides belong in `apps/web/.env.local`; the root `.env` is read by the API. Never commit credentials.

## Where things are

| Path | What | Owner |
|---|---|---|
| `packages/schema` | **Frozen contracts**: zod entities, API types, SSE events, port interfaces, fixtures, memory repo | everyone (`[contract]` PRs) |
| `packages/platform` | SQLite repo (`node:sqlite`), local storage, photo ingest + auto-assign, seed | B |
| `packages/ai` | Claude + Nominatim adapters (and mocks), planner, replan, Ask, journal chat, captions, vlog script | C |
| `packages/tts` · `packages/video` | OpenAI/mock TTS; Remotion composition, `VlogPlayer`, render CLI | D |
| `services/api` | Hono host: adapter selection, route files per owner, SSE, files, vlog jobs, seed CLI | B (host), each owner (routes) |
| `apps/web` | Next.js UI: trips, wizard, map home, pin sheet, photo drop, tray, journal chat, vlog studio, **Auth0 sign-in** | A |
| `docs/` | [ARCHITECTURE](docs/ARCHITECTURE.md) · [CONTRACTS](docs/CONTRACTS.md) · [AUTH](docs/AUTH.md) · [AUTH0_SPONSOR](docs/AUTH0_SPONSOR.md) · [TEAM](docs/TEAM.md) · [PLAN](docs/PLAN.md) · [DEMO](docs/DEMO.md) · [DECISIONS](docs/DECISIONS.md) | D keeps PLAN honest |

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm dev:api` / `pnpm dev:web` | run api + web (or one of them) |
| `pnpm auth0:setup` | create the Auth0 application and write `apps/web/.env.local` ([docs/AUTH.md](docs/AUTH.md)) |
| `pnpm auth0:brand` | dress the Auth0 login page in Pinlog's colours and copy (`--dry-run` to preview) |
| `pnpm seed` / `pnpm seed:reset` | (re)create `data/pinlog.db` + `data/files` from the fixtures (`--start YYYY-MM-DD` shifts the demo dates, `--photos generate` re-renders the demo JPEGs) |
| `pnpm typecheck` · `pnpm test` · `pnpm lint` | what CI runs (tsc per package + dependency-direction check · vitest projects · prettier) |
| `pnpm smoke` | end-to-end check of every route against a running API |
| `pnpm studio` | Remotion Studio on :3100 (run `pnpm seed` first; it serves `data/files`) |
| `pnpm render -- --vlog <id>` | stretch: local MP4 render |
| `pnpm preview` | rebuild `docs/preview.html`, the single-file clickable prototype (fixtures + embedded photos) |

Ports: web 3000 · api 8787 · Remotion Studio 3100. Web fixture mode (no API at all): http://localhost:3000/?fixture=1

## Rules that keep four people unblocked
1. Contracts and fixture ids are frozen; change = `[contract]` PR, additive only, all four pinged.
2. Your folder is yours; other folders are PRs to their owner. `scripts/check-deps.mjs` enforces the dependency direction.
3. Everything must keep working with no keys (`PINLOG_MODE=mock`) — with one agreed exception, Auth0 ([docs/AUTH.md](docs/AUTH.md)).
4. No `pnpm add` without a message in the chat. `main` is always green.

Stack: pnpm workspaces · TypeScript 5.9 · Node 24 (`node:sqlite`) · Hono · zod 4 · Next.js 16 + React 19 + Tailwind 4 ·
MapLibre GL + OpenFreeMap · Auth0 Universal Login · Claude API · Nominatim · OpenAI TTS · Remotion 4.
