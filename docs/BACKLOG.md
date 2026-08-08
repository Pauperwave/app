# Backlog

Committed, ranked work items. P1 = urgent/blocking, P2 = important, P3 = nice to have.

## P1

- **Migrate data layer from `useAsyncData`/plain composables to Pinia Colada + BFF, following `league`'s pattern exactly (ADR-007, ADR-015 in league).** Deadline-driven: integration with `league` is due by 2026-08-30 (draft "Lo Hobbit"), and the user wants new/existing work built against the target architecture instead of throwaway solutions. Confirmed scope (2026-08-08): full replication including the BFF layer, not just Pinia Colada for reads.
  - **Done:** deps added (`pinia`, `@pinia/nuxt`, `@pinia/colada`, `@pinia/colada-nuxt`, `@pinia/colada-plugin-cache-persister`), modules registered in `nuxt.config.ts`, `colada.options.ts` added. `wanted-cards` domain fully migrated as the pilot: `useWantedCardsQuery.ts` + `useWantedCardsMutations.ts` + `server/api/wanted-cards/{create,[id]/update,[id]/status,[id]/delete}.post.ts` + `server/utils/serverAuth.ts` (`requireUser`/`requireManagementPermission`) + `app/utils/error.ts`. Verified end-to-end in-browser, lint/typecheck clean. Full details and the `serverSupabaseUser` → JWT `sub` (not `.id`) gotcha in ADR-007, `docs/PROGRESS.md`.
  - **Remaining:** migrate `useAssociates` and `useAssociateGeocodes` (and any other composable under `app/composables/`) to the same query/mutation + BFF pattern, using the `wanted-cards` files as the concrete template instead of re-deriving the pattern from league each time.
  - Found: 2026-08-08, during the wanted-cards status refactor (`setStatus` full-page-reload bug) — see ADR-007 in `docs/PROGRESS.md`.

- **Drop overly-permissive RLS policy on `pauperwave_associates`.** The policy `"Only auth users can do things"` (`FOR ALL`, role `authenticated`, `USING (true)`, no `WITH CHECK`) grants any logged-in user full SELECT/INSERT/UPDATE/DELETE on every associate row — tax codes, birth dates, home addresses — and overrides the narrower `player_own_associate` and `management_full_access` policies, since Postgres RLS policies are OR'd together. Fix: `DROP POLICY "Only auth users can do things" ON public.pauperwave_associates;` then verify access still works as expected for management and self-service applicant flows.
  - Found: 2026-08-05, via manual RLS policy review.
  - Follow-up: audit other tables (`players`, transactions, tournaments, etc.) for the same catch-all-policy pattern before considering this closed.

- **Populate `created_by`/`updated_by` on the other 5 tables that have them** (`pauperwave_associates`, `pauperwave_associate_geocodes`, `pauperwave_associate_renewals`, `pauperwave_payments`, `user_roles`) — all currently unpopulated (no trigger, no code ever wrote them), same as `pauperwave_wanted_cards` was before 2026-08-08. The reusable pieces already exist: `server/utils/auditColumns.ts` (`auditColumnsForInsert`/`auditColumnsForUpdate`, generic — spread into any insert/update payload) and `public.set_updated_at()` (generic trigger function, just needs `create trigger ... before update ... execute function public.set_updated_at()` per table). Per-table FK target still needs a decision (`auth.users(id)` vs `pauperwave_associates(uuid)` — `wanted_cards` uses the latter since it's displayed in UI; `user_roles` is more of a system table and may legitimately want the former) — not a blanket schema change.
  - Found: 2026-08-08, while implementing the pattern for `wanted_cards` — see ADR in `docs/PROGRESS.md`.

## P2

- **Migrate magic-link auth from implicit flow to PKCE.** Current flow (`app/pages/auth/callback.vue`, `app/pages/login.vue`) relies on the implicit flow — the session token can briefly appear in the URL fragment/browser history. Given the app handles real associate PII, PKCE (customize email template with `{{ .TokenHash }}`, exchange via `verifyOtp({ token_hash, type: 'email' })` in the callback) is a worthwhile hardening step, though it requires callback-page and Supabase email-template changes.
