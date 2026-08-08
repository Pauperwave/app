# TODO

Loose observations and open questions, not yet committed to the backlog. Promote to `docs/BACKLOG.md` (with priority and effort estimate) once scoped.

- **Verify RLS/permissions for `pauperwave_associate_renewals` actually match what the app sees.** `pauperwave_associates_with_status` (added 2026-08-05) uses `security_invoker = true`, so its `LEFT JOIN` to `pauperwave_associate_renewals` is filtered by the *querying user's* RLS, not a superuser's. The table has no blanket `authenticated` policy — only `player_own_renewals` (own record only) and `management_full_access` (`has_management_permissions(auth.uid())`). All verification of the view's `active`/`to_renew` counts so far was done via `supabase db query --linked`, which runs as a privileged role and bypasses RLS entirely. Never confirmed whether the actual admin user's `auth.uid()` satisfies `has_management_permissions` — if it doesn't, the app sees `latest_renewal_year = NULL` for every associate and everyone falls into `expired`, silently wrong.
  - Found: 2026-08-05, while reasoning about the new membership-status view's RLS exposure.
  - Next step: as the logged-in admin, check what `pauperwave_associates_with_status` actually returns for `membership_status`/`latest_renewal_year`, compared to the privileged CLI query.

- **Full audit of all 28 `public` schema tables for the same class of issues found on `pauperwave_associates`.** This session found, on a single table: a dead always-`NULL` column (`associate_status`, dropped), a frontend/DB field name drift (`request_status` vs `membership_request_status`), several wrong nullability assumptions in the hand-written TypeScript type, and (documented separately in `docs/BACKLOG.md` P1) an overly-permissive catch-all RLS policy. Since this DB is meant to become the new base for `MagicTheGathering/league`, the same checks (dead/unused columns, DB-vs-code field name drift, nullability, RLS policy overlap) should be run systematically across the other 26 tables before treating the schema as stable.
  - Found: 2026-08-05, after fixing the above on `pauperwave_associates` alone and realizing it was found reactively (via a user-reported bug), not systematically.
  - Next step: table-by-table pass — columns + constraints + RLS policies vs actual app usage, starting with the other tables in the `pauperwave_*` family (`pauperwave_payments`, `payment_receipts`) since they're closest in spirit to what already got audited.
  - Scope note: `app` is meant to become a full gestionale for PauperWave — multi-format tournament organization (not just Commander: also Premodern, Draft, Pauper, etc.), membership renewals, payments, and tournament creation/management. The schema mixes Commander-specific tables (`mtg_commanders`, `commander_decks`, `tournament_kills`, `rulesets`/`ruleset__points`/`ruleset__descriptions` — points-based multiplayer-pod scoring is a Commander concept) with format-agnostic ones (`tournaments`, `tournament_registrations`, `tournament_standings`, `mtg_formats`). While auditing, flag anywhere the schema or app code implicitly assumes "it's Commander" instead of treating format as first-class data — those assumptions won't hold once Premodern/Draft/Pauper need the same tables.

- **Sidebar "Commander" section is hardcoded/static, not format-driven.** Added 2026-08-06 alongside stub pages for `/players`, `/commanders` (catalog), `/rulesets` — genuinely missing routes compared to `MagicTheGathering/league`'s route list. Labeled the section "Commander" explicitly (not folded into "Competizioni") to be honest that these are format-specific, not generic.
  - Found: 2026-08-06, while reasoning about how the sidebar should represent multiple formats going forward.
  - Why not generalized now: `mtg_formats` has 0 rows — no format, including Commander itself, is actually recorded as data yet. Building a dynamic per-format sidebar (e.g. reading `mtg_formats` to render a section per format) now would be speculative architecture for formats that don't exist in the DB yet — the same class of premature work already deferred elsewhere (ADR-003).
  - Next step: revisit when a second real format (Premodern/Draft/Pauper) gets actual DB rows and its own UI — that's the point to design format-aware navigation instead of a static "Commander" label.

- **Add "numero di iscritti", "formato" and "quota di iscrizione" columns to the tournaments table.** The `tournaments` list already has i18n keys for these (`tournament.columns.registeredPlayers`, `.format`, `.entryFee`) but the actual `/tournaments` page was reset to a placeholder (see below) before the real table was rebuilt against Supabase data.
  - Found: 2026-08-06, when clearing out `/tournaments`'s old mock-data table implementation.
  - Next step: rebuild the tournaments table against real `tournaments`/`tournament_registrations` data (not `/api/tournaments` mock), including these three columns from the start.

- **Tournament detail stepper needs dynamic per-step status once real round-tracking data exists.** `MagicTheGathering/league`'s `TournamentStepper.vue` gives each step a `description` computed from actual tournament state (registration open/viewing, round completed/in-progress/pending/viewing/correcting, tournament ended) and lets you click a past step to preview it (with snap-back for non-navigable ones). PauperWave's `tournaments/[tournamentId]/index.vue` adopted only the visual title+description shape, with static placeholder descriptions ("In attesa", "Iscrizioni aperte") — there's no `currentRound`/`tournamentStatus` concept backing it yet.
  - Found: 2026-08-06, comparing our tournament stepper against league's while deciding which pattern to adopt.
  - Next step: once tournaments have real round-tracking data (current round, per-round completion), mirror league's `roundStepDescription()` logic and add click-to-preview navigation for past rounds.

- **Unify `/associates` table styling with `/wanted-cards` — wanted-cards prevails.** The two `UTable` instances currently look/behave differently (row density, header treatment, filter toolbar layout); `/wanted-cards` is the newer implementation and should be the reference.
  - Found: 2026-08-07, user request after aligning the two pages' "Mostra colonne"/"Visualizza" buttons.
  - Next step: diff the two tables' `:ui` overrides and toolbar layout, port `/wanted-cards`'s styling onto `/associates`.

- **Simplify `/associates` table column headers.** Current headers are raw/verbose (e.g. full field labels for every one of the ~35 columns); needs a pass to shorten/clarify.
  - Found: 2026-08-07, user request.
  - Next step: scoping — decide which headers to shorten and to what, likely alongside the styling unification above since both touch the same table.

- **Add a contextual (right-click) row menu to `/associates`' table.** Done for `/wanted-cards` (table rows + grid cards, 2026-08-07) via `UContextMenu` + `UTable`'s `on-contextmenu` prop, currently only "Segna come trovata/in cerca" — no "Elimina" (see admin-gating TODO below). `/associates` still has no context menu at all.
  - Found: 2026-08-07, user request.
  - Next step: scope associate-specific actions (view detail/edit/delete) before implementing.

- **"Elimina" on a wanted-card request is back in the UI without a frontend admin check.** Initially removed entirely (2026-08-07) since there's no role/permission check wired into the frontend anywhere yet (checked: no `useSupabaseUser`-based role check, no admin flag on `Associate`, `settings/MembersList.vue`'s role dropdown isn't tied to auth) — reinstated same day at user request (with a confirmation modal) relying solely on the DB-level RLS policy (`has_management_permissions(auth.uid())`, same as update) to reject non-admins; a non-admin sees an error toast instead of a silently-ignored click.
  - Found: 2026-08-07, user request (initial removal), reversed same day (user request).
  - Next step: once there's a real way to know "is the current logged-in user an admin" client-side, hide/disable "Elimina" for non-admins instead of letting the request round-trip and fail.

- **`/wanted-cards` is really the seller's view, not a generic search — rethink the UI around that.** User insight (2026-08-07): almost nobody browsing the *wanted* list would search by card name — that's what a *seller* does ("does anyone want this card I have?"). The card-name search input has been hidden from the toolbar for now (still wired in state/filtering, just no UI control) since its current placement/framing doesn't match that use case.
  - Found: 2026-08-07, user observation during a mobile-toolbar UX discussion.
  - Next step: design a dedicated, prominent search entry point for sellers (separate from the list-browsing filters). **Update 2026-08-08:** the "own requests" half of this is now done — "Le mie richieste" filter button resolves the logged-in user to a `pauperwave_associates` row via email match (`currentAssociate` in `wanted-cards/index.vue`) and filters to only their cards. Only the seller-facing search entry point remains open.

- **Zero test files anywhere in the app, `/wanted-cards` included, despite `vitest`/`Playwright` being configured.** The runner is wired up (`pnpm test`/`test:e2e`, mirroring `league`) but no `*.test.*` file exists — every verification of `/wanted-cards` this session (CRUD, filters, tour, context menu, audit columns) was done manually via browser. Felt acutely on this route given how much surface it now has (two views, filters, mutations, permissions). See `docs/architecture/testing.md`.
  - Found: 2026-08-08, self-assessment of `/wanted-cards` maturity at user request.
  - Next step: `useWantedCardsFilters.ts`'s `filteredCards` (the single predicate now shared by both views, see `docs/architecture/testing.md`) is the highest-value first test given it already caused one drift bug historically.

- **Non-admin path on `/wanted-cards` never verified end-to-end.** We know insert is open to any authenticated user, and update/status/delete require `has_management_permissions` (enforced server-side in the BFF endpoints, see ADR-007/ADR-008). But no one has actually logged in as a non-management user and confirmed: (a) they can create a request, (b) attempting edit/delete/status-change surfaces a readable error toast instead of a confusing failure.
  - Found: 2026-08-08, self-assessment of `/wanted-cards` maturity at user request.
  - Next step: test with a non-admin associate account once one exists/is identifiable.

- **Mobile not re-tested since the tour/spotlight/filter additions.** Known issue (not prioritized for now, per user 2026-08-08): the guided tour's `#tour-wanted-cards-first-card` step assumes grid view is active — if a user starts the tour while on table view, that step's target won't exist in the DOM. Broader mobile responsiveness (toolbar wrapping with the new "Le mie richieste" button, tour popover sizing on small screens) also hasn't been checked since the last mobile pass earlier in the wanted-cards work.
  - Found: 2026-08-08, self-assessment of `/wanted-cards` maturity at user request.
  - Next step: low priority per user — revisit if/when mobile usage of this route actually matters for the 2026-08-30 deadline.

- **Pagination vs. virtualization/infinite scroll for `/wanted-cards`.** User preference (2026-08-08): no pagination — prefers virtualization + infinite scroll, for both the table and the card grid, once dataset size actually warrants it (currently 47 rows, a non-issue).
  - Found: 2026-08-08, self-assessment of `/wanted-cards` maturity at user request.
  - Next step: revisit once row count grows enough to matter; look at TanStack Virtual (already a `@tanstack/vue-table` sibling package) for both views.
