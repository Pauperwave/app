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
