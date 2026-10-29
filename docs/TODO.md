# TODO

Moved to GitHub Issues + the ["App" project](https://github.com/orgs/Pauperwave/projects/2) (2026-08-22), same as `docs/BACKLOG.md` — see that file for the reasoning.

The items that lived here as of 2026-08-22 are now issues [#9](https://github.com/Pauperwave/app/issues/9)–[#36](https://github.com/Pauperwave/app/issues/36), left without a Priority field (unlike the former `BACKLOG.md` items) since these were explicitly "not yet committed" — triage from there.

## Auth: double route guard and unchecked redirect (2026-10-24)

Found while comparing with PrestaBici. Not yet committed work.

- **Guard written twice**: `supabase.redirectOptions.exclude` in `nuxt.config.ts` and the public lists in `app/middleware/auth.global.ts` say the same thing, kept in sync by a comment. Pick one (the module redirect alone is enough) and delete the other.
- **`?redirect=` in `app/pages/auth/callback.vue` is not validated**: accept only internal paths (starts with `/`, not `//`) before `navigateTo`.
- **`supabase.cookieOptions` in `nuxt.config.ts` repeats defaults**: `sameSite: 'lax'` is already the module default, and an empty `domain` and `path: '/'` are what the cookie falls back to anyway. Remove the whole block and check that sign-in and sign-out still work.
- **`.mcp.json` is git-ignored**: the rule across all projects is to commit it (it only holds public project references, never keys). Remove it from `.gitignore`, check that the file has no secrets, and commit it.

## Round timer: 3 seconds of delay (2026-10-27)

Reported as "3 secondi di ritardo nel timer". Not reproduced at runtime; the likely cause is the publish path, see section 5 of `audits/2026-10-15-full-application-audit-second-pass.md`.

- **Reproduce first**: run a round with the organizer's timer and the Telegram Mini App side by side and measure the gap.
- **Publish path**: `useRoundTimerEngine.ts` sends an integer `elapsedSeconds` (up to 0.999 s lost), and `server/api/tournament-rounds/timer.post.ts` takes `now` only after the auth round trip, so every millisecond before that line pushes `phase_started_at` later. Consider publishing the organizer's own start timestamp instead of an elapsed count.

## Playwright e2e: set up Docker and local Supabase (2026-10-28)

`test/e2e/` has no specs yet. The authenticated flows need a safe database, so the plan is a local Supabase (`supabase start`, built from `supabase/migrations`), which needs Docker. Docker is not installed on this machine.

- **Install Docker** and check that `supabase start` brings the local stack up.
- **Seed script** for the local database (associates, a pending request, a tournament, a wanted card).
- **Auth fixture**: mint a session with the admin `generateLink` instead of the OTP email, stored as a Playwright `storageState` in a `setup` project in `playwright.config.ts`.
- **First specs**, from `plans/2026-08-18-testing-coverage-plan.md` tier 5: login to `/associates`, approve a pending request, create an Association Fee transaction, change a wanted-card status.
- **Public pages smoke spec** (`/login`, `/tesseramento`, `/calendario`, `/classifiche/*`) does not need Docker.

## Payments still linked to two cleaned-up tournaments (2026-10-29)

Two stale tournaments were ended and their registrations deleted on the production database: Premodern of 2026-09-16 (`defbf2ed-c26c-4e34-ba2a-f159d140f1a1`) and Pauper of 2026-09-23 (`99e39f47-34b2-4219-b7a3-badb02c47e2f`). They had no rounds, pairings or results, only payments, which were left alone on purpose.

- **16 payments** in `pauperwave_payments` point at the Premodern and **26** at the Pauper, so they still feed the `finance` report and the statistics.
- **Decide** whether they stay (real money received), get detached (`tournament_uuid` to null) or get deleted. Nothing to do until the user decides.
