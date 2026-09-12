# Team, ownership, and how we work for 24 hours

## Ownership (directory = owner; PR title prefix in brackets)

| Owner | Module | Directories | Cross-cutting hat |
|---|---|---|---|
| **A · Client Lead** `@OWNER_A` | Web UI | `apps/web/` | Design & UX, drives the demo laptop |
| **B · Platform Lead** `@OWNER_B` | Data, files, ingest | `packages/platform/`, `services/api/src/{app,container,env,cli}*`, `services/api/src/routes/{trips,pins,entries,media,files,share,health}.ts`, `scripts/`, `.github/` | DevOps: seed, env, CI, integration captain H+18→H+22 |
| **C · AI Lead** `@OWNER_C` | Planner, Ask, script | `packages/ai/`, `services/api/src/routes/{plan,ask,journal}.ts` | Quality: prompt evals, replay fixtures, hallucination checks |
| **D · Video Lead** `@OWNER_D` | Vlog | `packages/video/`, `packages/tts/`, `services/api/src/routes/vlogs.ts`, `services/api/src/jobs/` | PM & demo: runs checkpoints, keeps `docs/PLAN.md` honest, timekeeper on stage |
| everyone | Contracts | `packages/schema/`, `docs/CONTRACTS.md` | changes = `[contract]` PR, all four pinged |

Replace `@OWNER_A…D` in `.github/CODEOWNERS` and here with real GitHub handles.

## Branches and merging
- `main` is always green (`pnpm typecheck && pnpm test`, CI runs the same). Branch from `main`: `a/<topic>`, `b/<topic>`, `c/<topic>`, `d/<topic>`, `contract/<topic>`.
- Small PRs (< 400 lines), squash-merge, rebase before merge, merge at least every 3 hours. Nobody sits on a branch overnight.
- A PR must: pass `pnpm typecheck && pnpm test`; still work with no keys (`PINLOG_MODE=mock`); not add a package-to-package dependency (`scripts/check-deps.mjs` fails otherwise); not run `pnpm add` without a message in the chat (lockfile conflicts are the worst merge conflicts).
- Contract PRs merge first; everyone rebases right after.

## Working alone (why the scaffold is shaped this way)
- Contracts + fixtures are frozen: `demoFixtures()` is the same trip for everyone (`trip_pgh`, 9 pins, 18 photos, 7 notes, a hand-written vlog script).
- Every external provider has a mock; `pnpm dev` with no `.env` runs the whole loop with zero network calls.
- A works with `pnpm dev:web` alone (fixture mode: `?fixture=1`), or against the API in mock mode.
- B/C/D verify their routes with `curl` / `scripts/smoke.mjs` and unit tests against `createMemoryRepo` — no browser needed.
- D develops the composition in Remotion Studio (`pnpm studio`, port 3100) from the fixture script.

## Checkpoints (D runs them, 20 minutes max, five times)
Merge freeze 10 min before → everyone pulls `main` → on ONE laptop: `pnpm seed:reset && pnpm dev` from clean → walk
the demo beats as far as they go → mark each beat on the readiness board in [PLAN.md](PLAN.md) → assign fixes → resume.
If a checkpoint slips more than 45 minutes, cut from the cut list; never "push the checkpoint".

| Checkpoint | When | Exit criterion |
|---|---|---|
| I0 skeleton | H+0 | `pnpm i && pnpm seed && pnpm dev` works on all four laptops; everyone can say which port they consume and produce |
| I1 vertical slice on fakes | H+6 | live planner streams pins; seeded trip renders; Player plays the fixture vlog; MapLibre-in-Player go/no-go |
| I2 hero loop v1 | H+12 | photo drop lands on pins; Ask/journal stream; vlog job produces a script + TTS; first full walk with real keys |
| I3 feature freeze | H+18 | demo trip is beautiful; fallbacks wired; nothing new after this |
| I4 rehearsed | H+22 | 2 clean rehearsals (one offline); backup video recorded; `git tag demo` |

## Integration hell (H+18 → H+22) is planned, not a surprise
B is integration captain: owns `main`, decides merge order, nobody else force-pushes anything. Triage: P0 = breaks a
demo beat, P1 = visible ugliness on a beat, P2 = ignore until after the demo. No feature commits after H+18.

## Sleep (decide now, not at 3 a.m.)
B + D sleep H+12:30 → H+15:30 (right after I2). A + C sleep H+15:30 → H+18:30. Everyone awake from H+18:30.
The person who skips their sleep shift is the one who breaks `main` at H+20.

## Stage roles
A drives the laptop. The best speaker narrates. D keeps time (hand signal at 2:30). B watches the API log beside the laptop.
