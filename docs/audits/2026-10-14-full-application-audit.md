# Full application audit (2026-10-14)

<!-- docs/audits/2026-10-14-full-application-audit.md -->

User request: "a complete audit of the application". Point-in-time snapshot at commit `bc9b455f` (`main`), covering code quality gates, tests, dead code and duplication, complexity, dependencies, the BFF API surface and the live Supabase project (`app`, `uggrolzdntoamclgnzrt`, read-only: advisors and catalog queries, no writes).

Nothing was changed by this audit. Every finding below is flagged, not fixed.

## Summary

| Area | Result |
| --- | --- |
| `pnpm lint` | clean (0 errors, 0 warnings) |
| `pnpm check:paths` / `check:components` / `check:emoji` | clean |
| `pnpm test` | 170 files, 1381 tests, all passing (36 s) |
| `pnpm typecheck` | not run (slowest step, see CLAUDE.md); lint-clean and tests green only |
| `fallow dead-code` | no issues |
| `fallow dupes` | 3 clone groups, 52 lines (0.1%) |
| `fallow security` | 0 items (3888 call sites unresolvable, see blind spots) |
| `fallow health` | score 79 B, maintainability 92.9, 0 churn hotspots |
| `pnpm audit` | 41 advisories: 3 critical, 19 high, 13 moderate, 6 low (all transitive) |
| Supabase advisors | 5 ERROR (security-definer views), 6 WARN lint types (RLS initplan, permissive policies, definer RPCs, search_path, leaked passwords), INFO (indexes, no-policy tables) |
| E2E | none: `test/e2e/` holds only a README |

Highest-priority items: findings 1 and 2 (RLS write policies that the app does not use), then 3 (dependency advisories) and 4 (public RPC exposure).

## Findings

### 1. Player write policies on votes and kills do not bind the actor or the round (medium, unused attack surface)

Live policies on `tournament_votes` and `tournament_kills` (`player_vote_in_own_pairing`, `player_update_vote_in_own_pairing`, `player_record_kill_in_own_pairing`, `player_update_kill_in_own_pairing`) only check that the caller is one of the four players of the pairing. They do not check:

- **`voter_uuid` = the caller** on `tournament_votes`: a player in a pairing can insert a vote on behalf of another player of the pairing.
- **`killer_uuid` = the caller, or `killed_player_uuid` in the pairing** on `tournament_kills`: any killer/killed pair can be written.
- **Round or tournament status**: the BFF refuses writes on a closed round (`assertPairingEditable`, `server/utils/tournaments/editLocks.ts`), but a direct PostgREST call by a logged-in player does not go through it.

The same applies to `player_enter_own_result` / `player_update_own_result` on `tournament_round_results` (own row only, but no round-status check).

Impact: a logged-in associate could skew awards (Vittima, Carnefice, Master Brewer, Il Player) or edit their own result after the round closed, by calling the Supabase REST API with their own session. Requires an authenticated associate in that pairing.

Nothing in `app/` writes to these tables from the client: a grep for `.insert/.update/.upsert/.delete` on `tournament_votes`, `tournament_kills`, `tournament_round_results`, `event_attendees`, `tournament_registrations`, `players` and `commander_decks` finds no direct client write. All real writes go through service-role BFF routes or the Telegram bot.

Recommendation: drop the `player_*` write policies on `tournament_votes`, `tournament_kills` and `tournament_round_results` (they look like a leftover of the league port), keeping `management_full_access`. Do the same review for `event_attendees`, `tournament_registrations` (`player_own_registration`, `player_delete_own`, `player_register_self`: registration goes through `self-register.post.ts`, which also enforces status, capacity and shop organizers, none of which the RLS insert checks), `commander_decks` (`player_manage_own_decks`: `requireAdminOrOwnPlayer` in the BFF) and `players` (`player_update_self`). Confirm in `docs/supabase/3-RLS-policies.md` and update it with the result.

### 2. `pauperwave_wanted_cards` INSERT policy is `with check (true)` for any authenticated user (low-medium, already known)

Same finding as the 2026-09-29 audit ("Flagged for a decision"): the policy `Authenticated users can insert wanted cards` accepts any row. Still present. Decision from that audit still open.

### 3. Dependency advisories: 41, with 3 critical (medium, mostly build/dev tooling)

`pnpm audit` reports 6 low, 13 moderate, 19 high and 3 critical. All come through transitive paths of Nuxt modules; none is a direct dependency. By path:

- **`nuxt` > `@nuxt/devtools`**: `simple-git` (2 critical, 2 high, command execution), `shell-quote` (critical). Dev-server only: devtools is not part of a production build.
- **`@nuxt/hints`**: `devalue`, `fast-uri`, `brace-expansion`, `node-forge`, `serialize-javascript` (nitropack nested copy). `@nuxt/hints` and `@nuxt/a11y` are listed in `dependencies` and registered in `nuxt.config.ts` `modules`; whether they are active in the production build was not verified.
- **`@nuxt/ui`**: `@tiptap/core` (ReDoS in Markdown attribute parsing), `undici` via `@nuxt/fonts` > `unifont` (build time).
- **`@nuxt/image` > `ipx` > `sharp`**: librsvg CVE in `sharp` < 0.35.5. This is the one on a runtime path, if the IPX provider serves images in production. Not verified.
- **`@nuxt/eslint`**: `braces`, `source-map-js` (dev only).

`pnpm audit --prod` returns the same count, because Nuxt build modules sit in `dependencies`, so it does not separate runtime from build exposure.

Several advisories show patched version `<0.0.0` (`node-forge`, `braces`): no fix released, a pnpm override cannot help.

Recommendation: update `nuxt` (4.5.2 → 4.6.1), `@nuxt/ui` (4.11.2 → 4.11.3), `@nuxt/hints`, `@nuxt/image` and re-run `pnpm audit`; add `pnpm.overrides` for `simple-git`, `devalue`, `fast-uri`, `undici`, `sharp`, `@tiptap/core` where the patched range is semver-compatible. Not tested: updates were not applied here.

### 4. SECURITY DEFINER helpers and RPCs are executable by `anon` (medium, needs a decision)

Supabase advisors list 13 `SECURITY DEFINER` functions callable by both `anon` and `authenticated` through `/rest/v1/rpc/*`:

`assign_role`, `get_admin_telegram_chat_ids` (2 overloads), `get_user_role`, `get_user_roles`, `has_management_permissions`, `has_role`, `is_admin`, `is_admin_or_above`, `is_organizer`, `is_super_admin`, `log_player_login`, `purge_expired_trash`.

The role helpers are needed by RLS expressions, which run as the caller, so they must stay executable. The ones that should not be callable from the browser:

- **`assign_role(p_user_id, p_role)`**: writes `user_roles`. If it has no internal permission check (the round-transition RPCs are documented as having no check of their own, with the boundary at the endpoint, in `docs/PROGRESS.md`; whether `assign_role` follows the same pattern was not verified), any caller could grant themselves a role. Not verified: read the function body before acting.
- **`get_admin_telegram_chat_ids`**: returns admin Telegram chat ids to anyone.
- **`purge_expired_trash`**: deletes soft-deleted rows; callable by anyone, harmless only if idempotent and time-gated.
- **`get_user_role(s)`** with an arbitrary `p_user_id`: lets an authenticated caller enumerate other users' roles.

Recommendation: `revoke execute on function ... from anon, authenticated` for `assign_role`, `get_admin_telegram_chat_ids`, `purge_expired_trash`, `log_player_login` (if only the BFF calls it) and the user-id-parameterized role getters if RLS does not need them; keep the boolean `is_*`/`has_*` helpers.

### 5. Five SECURITY DEFINER views bypass the caller's RLS (medium)

`commander_stats`, `player_stats`, `players_public`, `tournament_award_winners`, `tournament_kills_summary` run with the view owner's permissions (no `security_invoker`), unlike `pauperwave_associates_with_status` and `players_full`, which are `security_invoker=true`. This may be deliberate (public aggregates over tables anon cannot read), in which case the advisor is a false positive to document; it is an ERROR-level advisor either way.

Recommendation: check each view's column list for personal data (`players_public` by name should be safe) and either set `security_invoker` where the caller's RLS already allows the read, or record in `docs/supabase/3-RLS-policies.md` that the view is intentionally definer.

### 6. `/api/check-associate` is an unauthenticated email-existence oracle (low-medium)

`server/api/check-associate.post.ts` takes an email and returns `{ exists: boolean }` for approved associates, with no authentication, no rate limit (no rate-limit code anywhere in `server/` besides the Telegram link flow) and a service-role client. It is needed before the magic link, but it lets anyone test which emails are association members, in bulk.

Recommendation: rate-limit it (per IP, e.g. a Nitro middleware or Vercel firewall rule), or stop revealing the result: always send the OTP and show a generic message (Supabase `signInWithOtp` with `shouldCreateUser: false` already does not create accounts).

### 7. `/api/**` has `cors: true` (low)

`nuxt.config.ts` `routeRules` sets `'/api/**': { cors: true }`, i.e. `Access-Control-Allow-Origin: *` on every BFF route. Because it is a wildcard without credentials, the browser will not send the session cookie cross-origin, so authenticated routes are not exposed; the unauthenticated ones (`check-associate`, `associates/apply`, `standings/*`, `cittadino`) become callable from any site. Nothing in the app is served cross-origin by design.

Recommendation: remove the rule, or restrict to the actual origins (`app.pauperwave.org`, `edh.pauperwave.org`).

### 8. Unranged selects on tables that grow per event (low, latent)

CLAUDE.md requires `fetchAllRows` for any `use<Domain>Query.ts` read because PostgREST truncates silently at 1000 rows. A heuristic scan (a `.select(` with no `fetchAllRows`, `.range(`, `.single()`, `.maybeSingle()` or `head: true`) lists 34 query composables without paging. Live row counts show none at risk today, but these grow with every event:

| Table | Rows now | Composable |
| --- | --- | --- |
| `tournament_votes` | 106 | `useTournamentVotesQuery.ts` |
| `player_login_history` | 107 | `usePlayerLoginHistoryQuery.ts` |
| `tournament_registrations` | 68 | `useTournamentRegistrationsQuery.ts`, `useMyTournamentRegistrationsQuery.ts` |
| `tournaments` | 73 | `useTournamentsQuery.ts` |
| `tournament_round_results` | 54 | `useTournamentRoundResultsQuery.ts`, `useCommanderUsageQuery.ts` |
| `tournament_kills` | 38 | `useTournamentKillsQuery.ts` |
| `commander_decks` | 63 | `useCommanderDecksQuery.ts` |
| `players` | 59 | `usePlayersQuery.ts`, `usePlayersFullQuery.ts` |

Already at risk-adjacent: `pauperwave_payments` at 813 rows (covered by `fetchAllRows`, but 187 rows from the cap, and unlikely to stop growing). `mtg_commanders` (3587 rows) is correctly read through the `get_commander_catalog()` RPC.

Recommendation: apply `fetchAllRows` to the per-tournament composables listed above when next touched; the per-tournament ones filter by `tournament_uuid`, so they are bounded by one event and are the lowest risk. The global ones (`tournaments`, `players`, `player_login_history`, `tournament_votes` in `useCommanderUsageQuery`) are the ones that will cross.

### 9. Database performance advisors (low)

- **`auth_rls_initplan` (53 policies)**: `auth.uid()` / `auth.<function>()` is called directly in the policy instead of `(select auth.uid())`, so it is re-evaluated per row. Most are `management_full_access` and `player_*` policies on every table. Wrapping the call is mechanical and safe; the cost is invisible at current volumes.
- **`multiple_permissive_policies` (264 rows of advisories)**: for the same role and action several policies are evaluated (`management_full_access` + `player_*` + public read). Expected given the model; merging is not worth the complexity at this size.
- **`unindexed_foreign_keys` (31)**: mostly audit columns (`created_by`, `updated_by`, `deleted_by`). Real candidates for a join or filter: `tournament_match_results.player1_uuid`/`player2_uuid`, `tournament_player_drops.round_uuid`/`player_uuid`, `pauperwave_payments.tournament_uuid`/`event_uuid`, `tournaments.organizer_uuid`/`location_uuid`, `pauperwave_wanted_cards.player_associate_uuid`.
- **`unused_index` (24)**: `idx_tournament_pairings_*`, `idx_tournament_kills_*`, `idx_user_roles_*` and others show no use. At this table size (14 pairings, 38 kills) an index is not used by the planner anyway: do not drop them based on this signal alone.
- **`function_search_path_mutable` (4)**: `next_pauperwave_associate_number`, `set_updated_at`, `set_wanted_card_found_at`, `get_commander_catalog`. Pin `search_path`.
- **`rls_enabled_no_policy` (5, INFO)**: `pauperwave_cardtrader_blueprints`, `pauperwave_cardtrader_expansions`, `pauperwave_telegram_chat_settings`, `pauperwave_telegram_link_attempts`, `pauperwave_telegram_support_threads`. Service-role only tables: intentional, matches the BFF-only access.
- **`auth_leaked_password_protection`**: disabled. The app is magic-link only, so it has no effect here.

### 10. Code health (info)

- `fallow health` 79 B: deductions are hotspots (-10.0) and unit size (-10.0). The biggest units are templates (`AcceptancePicker.vue` 469 lines, `associates/index.vue` 450, `associates/requests.vue` 401, `tournaments/index.vue` 398, `TablePreviewModal.vue` 387, `CommanderRoundManager.vue` 371) and `useAssociatesTableColumns.ts` (372).
- Top refactor targets by priority are high-fan-in files (`app/utils/error.ts` 42 dependents, `prizeAllocation.ts` 7, `useTransactionFormFields.ts` 4): signals, not defects.
- `tournaments/list/AddModal.vue` has the highest risk score (323 lines, 11 fan-out); `useScryfallCardSearch.ts` and `matchReportData.ts` follow.
- Duplication is 0.1%: `menzioni.ts` / `commanderPodData.ts`, `matchReportData.ts` / `commanderPodData.ts`, and two `scripts/check-*.mjs`. All small.
- About 16 `!` non-null assertions remain in components and utils (`CalendarHeatmap.vue`, `KillFlowCanvas.vue`, `median.ts`, `cardColors.ts`, `mockPlacements.ts`, ...), against the "no non-null assertions" rule. Most are array-index accesses under `noUncheckedIndexedAccess`.
- 65 `eslint-disable` / `@ts-*` / `as any` hits in 31 files, mostly `vue/*` rules in form-field components (2 each). Not itemized.
- No `withDefaults(` and no `console.log` in `app/`, `server/` or `shared/`.
- `server/api/notifications.ts` still returns `[]` (scaffold with no backing table), as documented.

### 11. Test coverage (info)

170 unit test files / 1381 tests, all green. Playwright is configured but `test/e2e/` has no spec. For the testing philosophy in global CLAUDE.md (E2E only for significant flows) the missing piece is one or two flows: the 1vs1 tournament lifecycle (registration → round 1 → result → advance → end) is the obvious first candidate.

## Reviewed, no issue found

- **BFF permissions**: 102 route files under `server/api`. All mutations go through `requireManagementPermission`, `requireAdminPermission`, `requireSuperAdminPermission`, `requireUser`, `requireAdminOrOwnPlayer` / `requireAdminOrDeckOwner`, or `definePairingWriteHandler` (management check + round-in-progress check). The 22 files with no such call by name were read or classified: public by design (`check-associate`, `cittadino`, `standings/*`, `notifications`), authenticated at a shared layer (`cardtrader/*` via `requireUser` in `resolveCardTraderRequestContext`), self-scoped (`tournament-registrations/self-*`, session-derived associate), or secret-guarded (`internal/deploy-notice`, header secret).
- **`/api/dev/test-login`**: guarded by `import.meta.dev`, which is compiled out of production builds; also needs `DEV_TEST_ASSOCIATE_EMAIL`.
- **Swiss 1vs1 flow**: complete for Pauper/Premodern/etc. (pairings, results incl. Telegram, byes, drops, tiebreaks, prizes, final standings). Known stubs: Draft round view and Cubo Commander use the `RoundManager.vue` placeholder; the "Premi" award step is Commander-only. See `docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md`.
- **Dead code / dependencies**: fallow reports 0% dead files and exports. Outdated packages are patch/minor except majors held back: `@tanstack/vue-table` 8 → 9, `vitest` 4 → 5, `@vueuse/*` 14 → 15, `typescript` 6 → 7, `@nuxtjs/robots` 6 → 7, `happy-dom` 20 → 21.

## Not covered

- `pnpm typecheck` and `pnpm test:coverage` were not run.
- No browser or runtime verification of the UI (not requested; browser use requires an explicit yes).
- Production build output, bundle size and Lighthouse/Core Web Vitals.
- Vercel project settings, environment variables and Supabase Auth configuration (URL allowlist, OTP expiry, SMTP).
- The Telegram bot's webhook authentication and group/chat permission checks beyond what fallow and the earlier 2026-09-29 audit covered.
- Whether `@nuxt/hints`, `@nuxt/a11y` and the IPX image provider are active in the production build.
- fallow blind spot: 3888 call sites use patterns it could not resolve (dynamic dispatch, computed members), so "0 security items" is a lower bound.

## Suggested order

1. Drop the unused `player_*` write policies on `tournament_votes`, `tournament_kills`, `tournament_round_results` (finding 1), then review the other player-scoped policies.
2. Read `assign_role` and the other exposed definer functions, revoke `anon`/`authenticated` execute where not needed (finding 4).
3. Update Nuxt and Nuxt UI, re-run `pnpm audit`, add overrides for what remains (finding 3).
4. Rate-limit or neutralize `/api/check-associate` (finding 6) and tighten CORS (finding 7).
5. Decide the wanted-cards INSERT policy (finding 2).
6. Page the global queries before they cross 1000 rows (finding 8).
7. One Playwright flow for the 1vs1 tournament lifecycle (finding 11).
