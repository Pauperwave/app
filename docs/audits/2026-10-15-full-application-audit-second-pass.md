# Full application audit, second pass (2026-10-15)

<!-- docs/audits/2026-10-15-full-application-audit-second-pass.md -->

User request: "audit the whole application and write another document". This follow-up builds on `2026-10-14-full-application-audit.md`. It does not repeat that audit's findings. It covers that audit's "Not covered" list, re-checks its unverified claims against the live database, and adds what it did not look at: the `authenticated` attack surface, BFF input handling, the Telegram webhook and Mini App, the round-timer delay reported in `feedback.txt`, and per-area test coverage.

Snapshot at commit `bc9b455f` (`main`). Live Supabase project `uggrolzdntoamclgnzrt`, read-only: catalog and `pg_policies` queries, function and view definitions, row counts. No writes. Nothing was changed by this audit. Every finding below is flagged, not fixed.

## Summary

| Area | Result |
| --- | --- |
| `pnpm typecheck` | clean (0 errors), not run in the 2026-10-14 audit |
| `pnpm test:coverage` | 170 files, 1381 tests, all passing; lines 18.9% overall (see finding 9) |
| Corrections to 2026-10-14 | finding 4 (`assign_role`) resolved, finding 6's recommendation is wrong, finding 3's open questions answered |
| New, high | 1: a player can repoint their own `players` row to another member and read that member's personal data |
| New, medium | 2: anyone with an inbox becomes `authenticated`, which exposes home coordinates and names; 3: anon can insert membership applications directly |
| New, low-medium | 4: `apply.post.ts` mass assignment; 5: round-timer lag (likely cause of `feedback.txt` item 1); 6: Telegram webhook fails open without its secret |
| New, low | 7: no BFF schema validation; 8: DB error text returned to the client; 10: no security headers |

Fix 1 first: it is a real cross-member personal data leak, reachable today by any logged-in associate with a browser console.

## Corrections to the 2026-10-14 audit

- **Finding 4, `assign_role`: not exploitable.** The function body checks `is_admin_or_above(auth.uid())` first, refuses `role_locked` targets, and only lets a super admin grant or change `super_admin`. It can stay executable. Of the exposed definer functions, these still need a decision:
  - `get_admin_telegram_chat_ids` (both overloads, anon-callable): it returns the private chat ids of every admin. A Telegram chat id is also the user id, so this tells anyone who the admins are on Telegram. Revoke from `anon, authenticated`. Only the BFF calls it, with the service role.
  - `purge_expired_trash`: it only deletes rows older than `trash_retention_days`, so calling it early only runs the scheduled job early. Low risk, but revoke it anyway for least privilege.
  - `log_player_login` is a trigger function (`returns trigger`). It cannot be called through `/rpc`, so the advisor entry is noise.
  - `get_user_role(s)`: these still let an authenticated caller look up any user's role, given a `user_id`. `players.public_read` exposes every player's `user_id`.
- **Finding 6, `check-associate`: the recommendation is wrong.** It says `signInWithOtp` with `shouldCreateUser: false` already does not create accounts. In fact, `login.vue:82` and `useTesseramentoFlow.ts:107` both pass `shouldCreateUser: true`, and the `/tesseramento` flow needs that so a new applicant can verify their inbox. So the email check is only a UI gate. Anyone can call `signInWithOtp` from the browser and get a session. See finding 2 for the impact. `auth.users` holds 2 accounts with no `players` row, the latest created on 2026-10-04. They could be applicants or test accounts; not investigated.
- **Finding 3, open questions: answered.** `@nuxt/hints` returns early from `setup()` when `!nuxt.options.dev` (`node_modules/@nuxt/hints/dist/module.mjs:411`). `@nuxt/a11y` sets `enabled: nuxt.options.dev`. Neither ships in production, so their transitive advisories are dev-only. The IPX path (`sharp`) is live in production: `nuxt.config.ts` routes `cards.scryfall.io` images through `/_ipx/`.
- **Finding 5, definer views: what each one exposes.** `players_public` returns `first_name`, `last_name`, `user_id`, `associate_uuid` and `is_active` for every player. Through it, `authenticated` can read names that the `pauperwave_associates` RLS hides. `player_stats`, `tournament_award_winners` and `players_public` are `authenticated`-only. `commander_stats` and `tournament_kills_summary` are also anon-readable, but they hold only aggregates. `tournament_kills_summary` does not exclude `is_test` tournaments, unlike the other four views; that is a consistency issue, not a security one.

## Findings

### 1. `players.player_update_self` lets a player take over another member's personal data (high)

The policy `player_update_self` on `players` (UPDATE, `user_id = auth.uid()` in both `using` and `with check`) does not restrict columns. A logged-in associate can change their own row's `associate_uuid` with one PostgREST call. Every "own data" policy keys on `players.associate_uuid`:

- `pauperwave_associates.player_own_associate`: the full registry row, including `tax_code`, `phone_number`, `email_address`, `born_date`, `born_location` and the full residence address
- `pauperwave_payments.player_own_payments`, `payment_receipts.player_own_receipts`
- `pauperwave_associate_renewals.player_own_renewals`, `pauperwave_associate_membership_events.player_own_membership_events`

`uq_players_associate_uuid_key` blocks pointing at an associate that already has a player row. But 282 associates have no player row, and their uuids are easy to collect: `pauperwave_associate_geocodes` is readable by every authenticated user (finding 2) and has `associate_uuid` on every row. Chaining the two, an associate can read the registry data of most of the membership, one row at a time, and then point their row back.

Nothing in `app/` updates `players` from the client (no `.from('players')...update(` match). The policy is unused, like the 2026-10-14 finding 1 policies.

Recommendation: drop `player_update_self`. If a self-service update is ever needed, give it a column-level grant (`grant update (col) on players to authenticated`) that never includes `associate_uuid` or `user_id`, or route it through a BFF endpoint. Then check whether anyone has already used it: compare `players.updated_at` with `created_at` for rows whose `associate_uuid` changed (there is no history table, so this is best effort).

### 2. Anyone with an inbox becomes `authenticated`, and `authenticated` reads more than an outsider should (medium)

As corrected above, OTP sign-up is open by design for `/tesseramento`. So "authenticated" here means "any person who controls an email inbox", not "an associate". `get_user_role` makes such a user a `player`. The UI hides staff pages from them (`authorization.global.ts`), but PostgREST does not. Policies granted to all of `authenticated` with `using (true)`:

- **`pauperwave_associate_geocodes`**: `latitude`/`longitude` per `associate_uuid`. `scripts/geocode-associates.mjs` geocodes the full residence address first and falls back to city only when that fails, so most rows are home locations. The only consumer is `associates/index.vue` (`view-associates`, staff only).
- **`players_public`** (definer view): full names of every player.
- **`pauperwave_wanted_cards`** (read and insert, already known), **`pauperwave_settings`**, **`cittadino_editions`**, **`player_stats`**, **`tournament_award_winners`**: low sensitivity.

Recommendation: restrict the geocodes `SELECT` to `has_management_permissions((select auth.uid()))`, which matches its only use. For the others, decide whether "registered associate" (a `players` row exists) or management should be the bar rather than `authenticated`. A helper like `is_associate(auth.uid())` would let the policies say that directly.

### 3. `pauperwave_associates.public_apply` lets anon insert applications, bypassing the OTP gate (medium)

`public_apply` is an INSERT policy for `public` (so `anon` too). Its only `with check` is `membership_request_status = 'pending'`. The `/tesseramento` form no longer uses it: it posts to `server/api/associates/apply.post.ts`, which requires an OTP-verified session whose email matches the body. Nothing in `app/` inserts into `pauperwave_associates` from the client. So with the public anon key, anyone can:

- insert unlimited pending applications without verifying any inbox, and without the admin Telegram notification the BFF sends
- take someone else's email: `apply.post.ts` returns 409 "Esiste già una richiesta con questa email" for any existing row, so the real person can no longer apply
- set any other column, including `pauperwave_associate_number`, `association_date` and the `consent_*` flags

`server/api/check-associate.post.ts:14` still says "public_apply RLS inserts it as 'pending'", which is out of date.

Recommendation: drop `public_apply` (the BFF writes with the service role), and fix that comment.

### 4. `apply.post.ts` spreads the request body into the insert (low-medium)

`server/api/associates/apply.post.ts` inserts `{ ...body, membership_request_status: 'pending', request_date: now }` with the service-role client. Only the two forced fields are protected. A verified applicant can set `id`, `uuid`, `pauperwave_associate_number`, `association_date`, `payment_date`, `associate_type`, `created_by`/`updated_by` and the consent booleans. On a membership register, the consent flags (`consent_data`, `has_read_statute`, `has_acknowledged_surveillance_notice`) are legal records, so a client-side check is not enough. `updateAssociateById` (`server/utils/idRequest.ts:181`) also spreads, but it is admin-only, so that one is a trust decision, not a hole.

Recommendation: build the insert from an explicit allowlist of form fields, and require the consent flags to be `true` server-side.

### 5. Round-timer lag between the organizer and the Telegram Mini App (low-medium, likely cause of `feedback.txt` item 1)

`feedback.txt`: "Timer: 3 secondi di ritardo nel timer". Not reproduced at runtime. Reading the code, the lag is built into the publish path:

1. `useRoundTimerEngine.ts:236` publishes `elapsedSeconds: elapsed.value`, an integer floored from `Date.now() - startTime` (`:148`, `:261`). Up to 0.999 s is lost.
2. `server/api/tournament-rounds/timer.post.ts` computes `phase_started_at = now - elapsedSeconds * 1000`. But `now = Date.now()` is taken only after `requireManagementPermission` (a `getClaims` and a `has_management_permissions` RPC round trip) and `readBody`. Every millisecond of network latency, cold start and auth lookup between the organizer's click and that line pushes the start instant later, so the Mini App runs behind. On a cold Vercel function this can be seconds.
3. `resolveRoundTimer` (`shared/utils/tournaments/roundTimerState.ts:72`) floors the elapsed time again on the reader side.

The Mini App's own clock correction (`useEventTimer.ts:60`, midpoint offset) is correct, but it can only correct the reader's clock, not a start instant that was already late when stored.

Recommendation: have the client send elapsed time in milliseconds (`Date.now() - startTime.value`, not floored), and take `now` as the first statement of the handler, before any `await`. To remove the request latency as well, send the client's action timestamp and an offset estimate, the same midpoint technique the Mini App already uses. The engine has 1.1% coverage (finding 9), so add a unit test for the publish payload when fixing it.

### 6. The Telegram webhook accepts unauthenticated updates if its secret is unset (low-medium)

`server/api/telegram/webhook.post.ts` passes `useRuntimeConfig(event).telegramWebhookSecret` to grammy's `webhookCallback`. grammy only checks `X-Telegram-Bot-Api-Secret-Token` when `secretToken` is defined. If `TELEGRAM_WEBHOOK_SECRET` is missing in an environment, anyone can POST forged updates with an arbitrary `from.id`. The bot resolves identity from that id (`resolveAssociateUuidByChatId`), so a forged update could act as any linked associate, including writing positions, kills and votes through `commanderResultWizard.ts` (service-role writes via `server/utils/tournaments/commanderRound.ts`). The production environment variables were not checked (Vercel settings are out of scope).

The other secret-guarded paths are fail-closed and correct: `isDeployNoticeSecretValid` returns false when either side is empty and compares hashes in constant time. `verifyWebAppInitData` follows Telegram's HMAC spec, uses `timingSafeEqual` and checks `auth_date` against a 24 h window.

Recommendation: throw (500, or refuse to start the bot) when `telegramWebhookSecret` is empty, the same way `isDeployNoticeSecretValid` does.

### 7. No schema validation on any BFF request body (low)

`readBody` is used in 55 server files, `readValidatedBody` in none, and `valibot` (already a dependency, used client-side) is imported nowhere under `server/`. Bodies are cast with TypeScript generics (`readBody<NewTournamentPayload>`), which do nothing at runtime. Some endpoints validate by hand and do it well (`tournament-rounds/timer.post.ts`, `transactions/create.post.ts` via `validatePayerInfo`). Most rely on Postgres types and constraints. For example, `tournaments/create.post.ts` accepts any `status` string, so a tournament can be created directly as `completed`.

Behind `requireManagementPermission` this is a robustness issue, not a security one. It matters on the endpoints reachable by non-staff: `associates/apply` (finding 4), `tournament-registrations/self-*`, `check-associate`, `telegram/round-timer`.

Recommendation: start with valibot schemas plus `readValidatedBody` on the non-staff endpoints. Extend to the others only when they are next touched (YAGNI applies).

### 8. Database error text is sent to the client (low)

120 `createError` calls set `statusMessage: error.message` (or `error?.message`) from a Supabase/Postgres error. That exposes constraint, column and function names to any caller, including on the public endpoints. It also mixes English Postgres text into an Italian UI.

Recommendation: log the raw error server-side and return a fixed Italian message. A shared `throwDbError(error, fallback)` helper in `server/utils` would cover all 120 sites mechanically.

### 9. Test coverage is concentrated in pure utils; authorization and the round engine are untested (info)

`pnpm test:coverage`: 18.9% lines overall. That number is expected under the unit-heavy policy, because components and pages are 0% by design. The per-area numbers matter more:

| Area | Lines |
| --- | --- |
| `shared/utils` | 95.6% |
| `app/utils/tournaments`, `commanders`, `finance` | 88–100% |
| `app/composables` | 52.2% |
| `app/composables/tournaments/rounds` (includes `useRoundTimerEngine.ts`) | 1.1% |
| `server/utils` | 7.8% |
| `server/utils/serverAuth.ts`, `idRequest.ts`, `tournaments/editLocks.ts` | 0% |
| `server/api/**` | 0% (handlers, expected) |

`serverAuth.ts` is the whole BFF authorization layer, and `editLocks.ts` is the round-closed guard. Both are small and pure enough to unit test with the existing `test/unit/server/fakeSupabase.ts`. They are the highest-value gaps, ahead of any E2E work.

### 10. No security response headers (low)

There is no `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `Permissions-Policy`: no `routeRules` headers, no Nitro middleware setting them, and no `vercel.json`/`vercel.ts`. The staff dashboard can be framed by any site (clickjacking on destructive buttons). `/telegram/**` has to stay frameable by Telegram's web clients, so the rule must exclude it.

Recommendation: add `routeRules` headers: `frame-ancestors 'none'` on everything except `/telegram/**`, plus `Referrer-Policy: strict-origin-when-cross-origin`. Leave a full CSP for later (Nuxt UI, ECharts and Leaflet need care), possibly via `nuxt-security`.

### 11. Housekeeping (info)

- **`nuxt-auth-utils`** is a dependency, not registered in `modules`, and not imported anywhere. It is hidden from fallow by `.fallowrc.json` `ignoreDependencies`, so fallow's "no unused dependencies" result does not cover it. `vue-echarts` and `@formkit/auto-animate` are also in that list and have no direct reference in `app/`. `nuxt-echarts` may use `vue-echarts` as a peer, so check before removing either.
- **`CLAUDE.md` is out of date on validation**: it says `nuxt.config.ts` pre-bundles `zod`. The project uses `valibot` (`optimizeDeps.include`), and `zod` is imported nowhere.
- **`nuxt.config.ts` breaks the comment rules**: five Italian comments (lines 64–66, 108, 195, 211) and history in comments ("user request, 2026-08-29", "confirmed 2026-08-30", "decision 2026-09-02", "see MagicTheGathering/league's"). 35 more dated or "user request" comments exist under `app/`, `server/` and `shared/`.
- **`package.json` `name`** is still `nuxt-ui-template-dashboard`.
- **Anon has table-level `TRUNCATE`** on every public table (Supabase default grants). PostgREST cannot issue `TRUNCATE`, so it is not reachable today. Revoking it is cheap extra safety, because `TRUNCATE` ignores RLS.

## Reviewed, no issue found

- **`pnpm typecheck`**: clean.
- **BFF authorization helpers** (`server/utils/serverAuth.ts`): `requireUser` → role RPC with `user.sub` (JWT-verified by `serverSupabaseUser`), fail-closed on RPC error. Correct, but untested (finding 9).
- **`tournaments/create.post.ts`**: management check first, then a super-admin check whenever `isTest` is set.
- **Telegram Mini App auth** (`webAppAuth.ts`) and **deploy-notice secret**: see finding 6.
- **XSS sinks**: the only `v-html` is the two static, self-authored markdown notices under `/tesseramento`. Admin Telegram notifications are sent as plain text (no `parse_mode`), so applicant names cannot inject markup.
- **No `.env` file is tracked** in git.
- **`authorization.global.ts`** awaits the role fetch before deciding, fail-closed. Every staff page carries a `meta.permission`.

## Not covered

- Runtime reproduction of finding 1 or 5. Both are read from policies and code, not exploited or measured. Finding 1 was deliberately not tested against production.
- Vercel environment variables (whether `TELEGRAM_WEBHOOK_SECRET` is set in every environment), Vercel firewall, and Supabase Auth settings (OTP expiry, rate limits, redirect allowlist, SMTP).
- Production build, bundle size, Lighthouse/Core Web Vitals.
- The Telegram bot's write paths beyond identity resolution (Commander report, `/importa`, `/elenco`, `/cercate`), and group/chat permission checks.
- Accessibility (`@nuxt/a11y` runs in dev only; its findings were not collected).

## Suggested order

1. Drop `players.player_update_self` and check `players` for repointed rows (finding 1).
2. Restrict `pauperwave_associate_geocodes` to management (finding 2), drop `public_apply` (finding 3). Together with step 1, this is one migration.
3. Revoke `get_admin_telegram_chat_ids` and `purge_expired_trash` from `anon, authenticated` (corrections). Fold this into the 2026-10-14 finding 1 migration as well.
4. Make the Telegram webhook fail closed without its secret, and confirm the Vercel variable (finding 6).
5. Allowlist fields and enforce consent in `apply.post.ts` (finding 4).
6. Fix the timer publish precision and take `now` first (finding 5), with a unit test.
7. Unit tests for `serverAuth.ts` and `editLocks.ts` (finding 9).
8. Frame-ancestors / referrer headers (finding 10), the DB-error helper (finding 8), the housekeeping list (finding 11).
