# Pinlog — a map-first travel diary (HackCMU 2026)

Plan a trip as pins on a map, live it by dropping photos and notes onto those pins, then relive it as an
auto-generated vlog. **Everything is a pin.**

```
plan  ──►  pins on a map  ──►  photos auto-land on pins (EXIF)  ──►  one-tap vlog  ──►  share
```

## 60-second start (no keys needed)

```bash
node --version                      # 24 or newer (25 works); node:sqlite is built in
npm i -g pnpm@10.15.0               # once per laptop (Homebrew node has no corepack)
pnpm install
pnpm seed                           # demo trip "Pittsburgh weekend": 9 pins, 18 photos, 7 notes, a finished vlog
pnpm dev                            # api http://localhost:8787 · web http://localhost:3000
pnpm smoke                          # in a second terminal: every route end to end against the running api
```

Demo day: `pnpm seed:reset --start 2026-09-12` (the day before the demo) makes the seeded "Day 2" today.

Open http://localhost:3000 → the seeded trip. With no `.env` every provider is a mock ("Demo mode" badge).
For real Claude / OpenAI TTS / Nominatim: `cp .env.example .env`, add keys, set `PINLOG_MODE=live`, restart.

## Where things are

| Path | What | Owner |
|---|---|---|
| `packages/schema` | **Frozen contracts**: zod entities, API types, SSE events, port interfaces, fixtures, memory repo | everyone (`[contract]` PRs) |
| `packages/platform` | SQLite repo (`node:sqlite`), local storage, photo ingest + auto-assign, seed | B |
| `packages/ai` | Claude + Nominatim adapters (and mocks), planner, replan, Ask, journal chat, captions, vlog script | C |
| `packages/tts` · `packages/video` | OpenAI/mock TTS; Remotion composition, `VlogPlayer`, render CLI | D |
| `services/api` | Hono host: adapter selection, route files per owner, SSE, files, vlog jobs, seed CLI | B (host), each owner (routes) |
| `apps/web` | Next.js UI: trips, wizard, map home, pin sheet, photo drop, tray, journal chat, vlog studio | A |
| `docs/` | [ARCHITECTURE](docs/ARCHITECTURE.md) · [CONTRACTS](docs/CONTRACTS.md) · [TEAM](docs/TEAM.md) · [PLAN](docs/PLAN.md) · [DEMO](docs/DEMO.md) · [DECISIONS](docs/DECISIONS.md) | D keeps PLAN honest |

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm dev:api` / `pnpm dev:web` | run api + web (or one of them) |
| `pnpm seed` / `pnpm seed:reset` | (re)create `data/pinlog.db` + `data/files` from the fixtures (`--start YYYY-MM-DD` shifts the demo dates, `--photos generate` re-renders the demo JPEGs) |
| `pnpm typecheck` · `pnpm test` · `pnpm lint` | what CI runs (tsc per package + dependency-direction check · vitest projects · prettier) |
| `pnpm smoke` | end-to-end check of every route against a running API |
| `pnpm studio` | Remotion Studio on :3100 (run `pnpm seed` first; it serves `data/files`) |
| `pnpm render -- --vlog <id>` | stretch: local MP4 render |

Ports: web 3000 · api 8787 · Remotion Studio 3100. Web fixture mode (no API at all): http://localhost:3000/?fixture=1

## Rules that keep four people unblocked
1. Contracts and fixture ids are frozen; change = `[contract]` PR, additive only, all four pinged.
2. Your folder is yours; other folders are PRs to their owner. `scripts/check-deps.mjs` enforces the dependency direction.
3. Everything must keep working with no keys (`PINLOG_MODE=mock`).
4. No `pnpm add` without a message in the chat. `main` is always green.

Stack: pnpm workspaces · TypeScript 5.9 · Node 24 (`node:sqlite`) · Hono · zod 4 · Next.js 16 + React 19 + Tailwind 4 ·
MapLibre GL + OpenFreeMap · Claude API · Nominatim · OpenAI TTS · Remotion 4.
