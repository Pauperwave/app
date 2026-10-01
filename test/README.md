# test

vitest (`pnpm test`) and Playwright (`pnpm test:e2e`) are configured (`vitest.config.ts`, `playwright.config.ts`), mirroring `MagicTheGathering/league`. Unit tests live in `test/unit/` (`utils/`, `composables/` and `server/`, 112 files as of 2026-10-01); there are no component tests and no Playwright specs yet, see `docs/architecture/testing.md`.
