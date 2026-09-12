<!-- Title prefix: [A] [B] [C] [D] or [contract] -->

## What

## Proof (screenshot, curl output, or test names)

## Checklist
- [ ] `pnpm typecheck && pnpm test` green
- [ ] still works with no keys (`PINLOG_MODE=mock`)
- [ ] touches `packages/schema`? → title starts with `[contract]`, additive only, fixtures updated, all four owners pinged
- [ ] no new package-to-package dependency (`scripts/check-deps.mjs`)
- [ ] no `pnpm add` without a message in the chat
- [ ] updated my nodes in `docs/PLAN.md`
