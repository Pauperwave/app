# TODO

Loose observations and open questions, not yet committed to the backlog. Promote to `docs/BACKLOG.md` (with priority and effort estimate) once scoped.

- **Verify RLS/permissions for `pauperwave_associate_renewals` actually match what the app sees.** `pauperwave_associates_with_status` (added 2026-08-05) uses `security_invoker = true`, so its `LEFT JOIN` to `pauperwave_associate_renewals` is filtered by the *querying user's* RLS, not a superuser's. The table has no blanket `authenticated` policy — only `player_own_renewals` (own record only) and `management_full_access` (`has_management_permissions(auth.uid())`). All verification of the view's `active`/`to_renew` counts so far was done via `supabase db query --linked`, which runs as a privileged role and bypasses RLS entirely. Never confirmed whether the actual admin user's `auth.uid()` satisfies `has_management_permissions` — if it doesn't, the app sees `latest_renewal_year = NULL` for every associate and everyone falls into `expired`, silently wrong.
  - Found: 2026-08-05, while reasoning about the new membership-status view's RLS exposure.
  - Next step: as the logged-in admin, check what `pauperwave_associates_with_status` actually returns for `membership_status`/`latest_renewal_year`, compared to the privileged CLI query.

- **Full audit of all 27 `public` schema tables for the same class of issues found on `pauperwave_associates`.** This session found, on a single table: a dead always-`NULL` column (`associate_status`, dropped), a frontend/DB field name drift (`request_status` vs `membership_request_status`), several wrong nullability assumptions in the hand-written TypeScript type, and (documented separately in `docs/BACKLOG.md` P1) an overly-permissive catch-all RLS policy. Since this DB is meant to become the new base for `MagicTheGathering/league`, the same checks (dead/unused columns, DB-vs-code field name drift, nullability, RLS policy overlap) should be run systematically across the other 26 tables before treating the schema as stable.
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

- **Add a contextual (right-click) row menu to both `/associates` and `/wanted-cards` tables**, with entries specific to each table's rows (not a generic shared menu).
  - Found: 2026-08-07, user request.
  - Next step: scope what actions belong per table (e.g. associates: view detail/edit/delete; wanted-cards: mark found/edit/delete) before implementing.
