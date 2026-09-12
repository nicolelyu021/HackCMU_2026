# Handoff — where Pinlog stands and what to do next

> **Latest update:** use the [README startup guide](../README.md#start-the-hackathon-demo-no-api-keys-needed) and [frontend design handoff](DESIGN_HANDOFF.md). The historical green checks below predate the latest design changes; final build verification is outstanding. Smoke checks mutate demo data and should use an isolated API.

_Written 2026-09-12 ~00:30 ET, after two Claude sessions. Read this first, then [PLAN.md](PLAN.md) (the status board) and
[DEMO.md](DEMO.md) (the 3-minute script). Owners: A Client · B Platform · C AI · D Video ([TEAM.md](TEAM.md))._

## 一句话（中文速览）

骨架全部做完：7 个包都有真实实现（不再是 TODO），69 个测试、端到端 smoke、`next build` 全绿；有一个零依赖的可点击手机形态原型 `docs/preview.html`；
产品方向已定为**移动优先的 PWA**（路线 1），第一步（手机连 API、PWA 元信息）已完成，第二步（手机壳：底部 tab、底部面板）代码在 `main` 上但**手机截图还没复核**。
下面每个人的下一步都列出来了；先跑 `pnpm install && pnpm seed && pnpm dev`，手机和电脑连同一个 Wi-Fi，打开启动日志里打印的 `http://<电脑IP>:3000`。

## 1 · What exists (all on `main`)

| Area | State | Proof |
|---|---|---|
| `packages/schema` | frozen contracts + fixtures + memory repo; `Repo.importRows` added (additive) | `pnpm test` (schema project) |
| `packages/tts` (D) | WAV helpers, mock (silent, estimated length), OpenAI adapter | tests |
| `packages/platform` (B) | `node:sqlite` repo, local files, EXIF read (browser + server), 300 m/±2 h auto-assign, seed with 18 EXIF-stamped demo JPEGs | tests incl. 16/16 fixture photos land right |
| `packages/ai` (C) | LLM = `replay(fallback(anthropic → mock))`, Nominatim + mock places, planner (stream), replan (diff, locked pins), Ask/chat/summary (grounded, no tools), captions, vlog script (assembled deterministically) | tests |
| `services/api` | every route in [CONTRACTS.md](CONTRACTS.md), in-process vlog job, `pnpm seed`, `pnpm smoke` | 12 route tests + smoke 19/19 |
| `packages/video` (D) | Remotion composition (title · MapLibre flyover · Ken Burns · outro route), `VlogPlayer`, Studio root, render CLI; static-route fallback when the map style fails/times out (8 s) | tests; Player rendered in headless Chrome |
| `apps/web` (A) | trips · wizard · map home (pins, plan streaming, photo drop + landing HUD, tray, pin sheet, journal chat) · vlog studio; **mobile-first shell WIP** (see §3) | `next build`; screenshots of all pages |
| `docs/preview.html` | single-file clickable prototype from the fixtures (`pnpm preview`); also published as a claude.ai artifact | open it |

Verified end to end on this laptop, mock mode: `pnpm typecheck` · `pnpm test` (69) · `pnpm smoke` (19 beats) · `pnpm build` (web).
**Never exercised:** real keys (Claude / Nominatim / OpenAI TTS), basemap tiles + live MapLibre flyover in a real browser
(headless Chrome has no WebGL/tiles), `pnpm render` (MP4), music.

## 2 · Run it

```bash
npm i -g pnpm@10.15.0          # once (Homebrew node ships no corepack)
pnpm install
pnpm seed                      # or on demo day: pnpm seed:reset --start 2026-09-12  (Day 2 = today)
pnpm dev                       # api :8787 · web :3000 — the api log prints "on your phone → http://<lan-ip>:3000"
pnpm smoke                     # second terminal: every route end to end
pnpm preview                   # rebuild docs/preview.html after fixture changes
```

Phone on the same Wi-Fi: open the LAN URL from the api log. The web app derives the API URL from the page host
(`apps/web/src/lib/config.ts`) and the API allows private-LAN origins, so no `.env` is needed. Live providers:
`cp .env.example .env`, add keys, `PINLOG_MODE=live`; `PINLOG_LLM_REPLAY=record` during rehearsal, `replay` on stage.

## 3 · Mobile-first (decided 2026-09-12: route 1 — PWA on the existing Next app; desktop layout kept)

| Step | State | Where |
|---|---|---|
| 1 · phone reaches the API automatically, LAN CORS, PWA manifest/icons/meta, safe-area utils | **done** `6d0a178` | `apps/web/src/lib/config.ts`, `services/api/src/app.ts`, `apps/web/public/*`, `layout.tsx` |
| 2 · phone shell: bottom `TabBar`, `Sheet` (bottom sheet on phones, side panel on md+) for pin/journal/tray, day-chip strip, phone map padding + fit on load, studio single column, deep links `?pin=` `?panel=journal` | **code on main, WIP** | `apps/web/src/components/{TabBar,ui,TopBar,PinSheet,JournalDrawer,Tray,DayChips,PlanTicker,LandingHUD}.tsx`, `map/TripMap.tsx`, `app/trips/[id]/page.tsx`, `vlog/VlogStudio.tsx` |
| 3 · verify on a real phone + fix | **todo (A)** | see checklist below |
| 4 · docs: "run it on your phone", DEMO pre-warm with the phone | **todo (A/D)** | README, DEMO.md |

Step-2 checklist for A (open http://<lan-ip>:3000/trips/trip_pgh on a phone, or Chrome devtools at 390×844):
- Top bar: title pill must shrink so the "Demo" badge stays on screen (fix `min-w-0` is in, not re-screenshotted).
- Map fits all pins of the selected day on load (fit now also runs on `onLoad`); pin stays visible above the bottom sheet (`easeTo` bottom padding = 62 % of height).
- Vlog page must not scroll horizontally (grid is `minmax(0,1fr)`, columns `min-w-0`); check the phone bezel width.
- Tab bar: Trips · Map · Journal (toggles the journal sheet) · Vlog; "Add photos" button and tray chip sit above it.
- Photo upload from the phone camera roll: EXIF GPS survives only if iOS "Options → Location" is on; HEIC arrives as JPEG.
- Then remove "WIP" from PLAN.md S5 and mark A1 done.

## 4 · Next steps per owner (mirrors PLAN.md I1 → I2)

- **A** · step-2 checklist above → A1 polish (day chips, now marker) → A2 (landing HUD on the phone) → A3 (chat UI) → A4 studio.
- **B** · B1 real demo trip: replace the generated JPEG cards with your own Oakland photos (AirDrop keeps GPS; `--photos generate` re-renders cards) and rewrite `demoEntries` in first person; B2 auto-assign edge cases; B4 `pnpm demo:reset`-style one-liner.
- **C** · C1 first live run: `.env` with `ANTHROPIC_API_KEY`, `PINLOG_MODE=live`, `PINLOG_LLM_REPLAY=record`; plan "Kyoto · 2 days" 5 times, check ≥ 6 verified pins < 25 s (planner runs at `effort: low`; timeouts in `packages/ai/src/llm/anthropic.ts`); record replays for the stage; C2 tune Ask/summary prompts (`packages/ai/src/ask.ts`); C3 script quality (`script.ts`).
- **D** · D1 MapLibre-in-Player go/no-go in a real Chrome (the static fallback already exists, so this is quality not risk); D2 flyover feel (`camera.ts`), Ken Burns, captions; D3 OpenAI TTS live (voice `nova` vs `shimmer`, `packages/tts/src/voices.ts`); D4 `pnpm render -- --vlog <id>` timeboxed 60 min.
- **everyone** · replace `@OWNER_A…D` in `.github/CODEOWNERS` and TEAM.md; keep `pnpm typecheck && pnpm test && pnpm lint` green before every push.

## 5 · Things we learned (so you don't relearn them)

- Prettier reformats everything; if you script edits (sed/python), match after formatting or rewrite the file.
- Headless Chrome screenshots: kill stray `--headless` Chromes and pass `--user-data-dir=<unique>` per run, or the new
  instance exits silently and you look at a stale PNG. WebGL/tiles do not render headless — judge the map in a real browser.
- The smoke script now writes only to a throw-away trip; earlier it replanned `trip_pgh` (that is why the demo trip once
  showed 8 pins) — `pnpm seed:reset` restores the fixtures.
- Fixture message timestamps are fixed instants on 2026-09-11/12; before then new chat rows sort earlier. Cosmetic.
- `pnpm preview -- --fragment <path>` passes `--` through to the script; call `tsx scripts/preview/build.ts --fragment …`
  from `packages/platform` for the artifact fragment.
- Node 25 works; `node:sqlite` needs no flag. pnpm was installed with npm.

## 6 · Commit log of the sessions (newest first)

`6d0a178` mobile-first step 1 · `23e2f61` single-file prototype · `b1eb6f3` smoke only mutates its own trip ·
`225c007` studio dark theme · `2c8ff15` Player static fallback · `d8f78b7` docs · `7ce6afb` vlog studio page ·
`56b0a47` web app · `e2c9359` video · `0cb6252` api routes/jobs/seed/smoke · `d75145b` ai · `9d6c76e` platform ·
`254d590` tts · `cff9299` contract `importRows` + demo photos.
