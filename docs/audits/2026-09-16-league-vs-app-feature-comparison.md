# Feature Comparison — `league` vs `app` (Pauperwave)

Comparison built from the two companion inventories:
- [`2026-09-16-league-components-composables-pages-inventory.md`](2026-09-16-league-components-composables-pages-inventory.md) (also mirrored in `MagicTheGathering/league/docs/audits/`)
- [`2026-09-16-app-components-composables-pages-inventory.md`](2026-09-16-app-components-composables-pages-inventory.md)

`league` is abandoned in favor of `app` ([[project_league_abandoned]] memory), but `app` was bootstrapped from it and much of the tournament-pairing engine is a direct or near-direct port. This doc exists to answer: what did `app` keep, what did it drop, what did it change, and what's genuinely new.

## Scale

| | `league` | `app` |
|---|---|---|
| Pages | 14 | 50 |
| Components | ~124 | 285 |
| Composables | ~65 | 195 |

`app` is roughly 3–4× the surface area of `league`. Most of the growth is new domains `league` never had (see below), not just a bigger tournament flow.

## Architecture differences

| Concern | `league` | `app` |
|---|---|---|
| Auth | Single hardcoded password gate (`usePasswordAuth`, `nuxt-auth-utils`), no per-user identity | Supabase magic-link/OTP, full user accounts, JWT-decoded role (`useUserRole`), 5-tier permission system (Public/Player/Organizer/Admin/SuperAdmin) with route-level `permission:` gates and a super-admin "view as" preview |
| Player identity | Numeric `player_id` | UUIDs throughout (`players.uuid`, `associates.uuid`) — a deliberate, pervasive change every ported composable had to adapt to |
| Person model | Single `Player` entity, directly CRUD-able (`usePlayerMutations`: create/update) | `Associate` (membership/legal identity, full CRUD) + derived, mostly read-only `Player` (`usePlayersMutations` only exposes `deletePlayer` — no create/update, since a player is generated from its associate) |
| Data layer | Pinia Colada queries direct-to-Supabase + BFF mutations (ADR-007), same pattern | Same pattern, consistently applied across ~195 composables |
| In-round session state | Pinia stores (`useTournamentStore`, `useRankingsStore`, `useCommandersStore`, `useKillsStore`, `useVotesStore`) as the live scratch space, mirrored to localStorage as crash insurance (`useSessionStorePersistence`), persisted to DB on submit | No Pinia stores for tournament session state — every action (kill, vote, ranking, commander pick) mutates the DB immediately via a Colada mutation; live standings recompute reactively from the persisted queries (`useLiveCommanderStandings`). Simpler mental model, no separate "unsaved draft" layer. |
| Charting | ECharts via `vue-echarts` (`BaseChart.vue` wrapper) | `@unovis/vue` (`StatChartCard.vue` wrapper) — different library project-wide, not a per-chart choice |
| Dev tooling | Button-click action log (`useActionLog`, `useButtonLogging`, `ActionLogPanel`, `ActionLogTrigger`) + developer-view overlay | Developer-view overlay ported 1:1 (`useDeveloperView`, margin/accessibility overlay); **action log / button-click logging was dropped entirely** — no equivalent composable or component in `app` |
| Onboarding | None | Guided-tour system on nearly every list/detail page (`useTour`, `TourGuide`, `TourSpotlight`, one `use<Domain>Tour.ts` per domain — ~20 of them) — entirely new in `app` |
| Routing/subdomains | Single app, no public-facing subdomain split | `calendario.pauperwave.org` and `cittadino.pauperwave.org` served from the same codebase via `layout: 'public-wide'` pages (`/calendario`, `/classifiche/*`) reusing the internal components in no-auth mode (`PublicCalendarPage`, `PublicCittadinoPage`, `PublicFormatPage`) |

## Ported almost verbatim (same shape, adapted for uuid + no Pinia store)

These `app` files carry explicit "ported bit-by-bit / verbatim from league" notes in their own code comments:

- **Pairing/round UI**: `tournaments/single/pairing/*` — `CommanderArt`, `CommanderModal`, `CommanderSearch`, `CommanderSuggestionRow`, `CommanderVoteCard`, `CurrentTime`, `DeckPlayVotesModal`, `VoteGrid`, `ForbiddenPairsSection`, `PairingPresetButtons`, `PairingSettingsModal`, `PairingWeightsSection`, `RoundStatusCard/Row/Section`, `RoundTimer`, `TimerControlButton`, `StandingsSidebar`, `TableCard`, `TablePlayerReceiptCard`, `TableReceiptSummary`, `TablePreviewGrid/Modal/Toolbar`, `TableScoreBreakdownModal`, `TableScoresModal`, `TableSeatItem`, `TablesFullscreenView`, `TableStateBadge`, `TournamentCommanderModal`, `TournamentVotesModal`, `WinnerChecklistCard`.
- **Pairing engine**: `composables/tournaments/pairingOptimizer.ts` (same multi-start greedy + local-swap algorithm, same double-weighting quirk documented as intentional), `useOptimizationNotifier`, `usePairingPresets`, `useAvoidPairsMutations`/`Query`, `useWinnerChecklist`.
- **Kill tracking**: `KillFlowCanvas`, `KillPlayerNode`, `KillTrackerModal` + `useTournamentKillsMutations`/`Query` — same Vue Flow node-graph approach, but **self-kill/"suicide" support was dropped** (`KillLoopbackEdge` has no equivalent in `app`) since the DB now has a check constraint forbidding it.
- **Shared UI primitives**: `ui/ConfirmModal`, `ui/ImageWithFallback`, `magic/ManaCost`, `players/single/BracketPickerModal`, `commanders/useCommanderAggregate`, `useCommanderCards`, `useCommanderSearch`, `useCommanderWhitelists` (all "ported from league" per their own file comments).
- **Misc**: `ui/useRovingTabindex`, `useDeveloperView` (+ overlay), `layout/DeveloperViewToggle`.

## Present in `league`, not (yet) ported to `app`

- **Standalone deck-browsing hub**: `league` had `/decks` (grid of every unique commander pairing across all players), `/deck/[deckSlug]` (aggregate deck detail), `/player/[slug]/deck/[deckSlug]` (per-player deck view), `/commander/[commanderSlug]` and `/commanders` (single- and all-commander stat pages). `app` only ported the commander-catalog pages (`/statistics/commanders`, `/statistics/commanders/[commanderSlug]`) — the deck-pairing-centric browsing (`/decks`, `/deck/[slug]`) has no `app` equivalent. `app`'s only per-deck UI is `players/single/CommanderDecksCard.vue` on a player's own profile.
- **Full ruleset CRUD**: `league`'s `/rulesets` was a real editor — create/edit/delete scoring rulesets (`RulesetFormModal`, `useRulesetMutations` with create/update/delete, `RulesetFieldGrid` for per-action point values), with per-league ruleset assignment driving actual scoring. `app`'s `/rulesets` is a **static publication page** — hand-maintained `FORMAT_RULES` constants rendered read-only, no `useRulesetsMutations` at all (only `useRulesetsQuery`/`useRulesetsTour`). Scoring itself always reads a single hardcoded "default" ruleset (`useRulesetPointsQuery`, explicitly flagged in its own composable as a stub — "no per-tournament/league ruleset FK exists yet"), even though `RulesetBadge`'s quick-change dropdown visually suggests per-league rulesets are wired up.
- **`/payments` overview**: `league`'s flat-fee (€5 POS/cash) registration-payment report with charts (`AmountByMethodChart`, `PaymentMethodMixChart`, `RegistrationTrendChart`) is superseded, not ported directly — `app`'s `/finance` + `/transactions` domain is a strict superset (real payment types, methods, per-category/format/month/tournament/event breakdowns), so this is an upgrade rather than a gap.
- **Direct player CRUD**: `league`'s `PlayerCreateForm`/`CreatePlayerModal` (create *and* edit a player, with fuzzy-duplicate detection) has no full equivalent in `app` — players are derived from associates; `app`'s only player mutation is delete.
- **Action log / button-click telemetry**: no `app` equivalent (see architecture table above).

## New in `app`, absent in `league`

Entire domains `league` never had:
- **Associates / membership management** — the single biggest addition: registration requests, approval workflow, renewals, membership status, consents, geocoded map view, membership timeline (~18 components, 16 composables). `league` had no membership concept at all, only `Player`.
- **Transactions / finance** — real payment-type/method tracking, per-category/format/month/tournament/event/payment-method breakdowns with unovis charts (~16 finance components, 9 transaction composables). Strictly beyond `league`'s flat-fee `/payments` page.
- **Wanted cards** — a card-request marketplace board (table/grid/dense views, Scryfall price lookups, drag-and-drop prefill) — entirely new domain.
- **Locations** — venue management (CRUD, geocoded map preview, opening hours editor, per-location tournament-activity heatmap) — entirely new.
- **Events** — a grouping layer above tournaments (a `League` "season" vs. an `Event` "day" that can host multiple tournaments), with its own day-schedule hour-grid — entirely new; `league` had no concept between "league" and "tournament".
- **Statistics dashboard** — associate age distribution, growth trends, renewal timing, tournaments-per-year, wanted-card status-over-time — entirely new (only the commander-catalog pages were ported from `league`, as noted above).
- **Settings / trash / permissions** — membership-fee config, trash retention config, member/role management, a full permission matrix page, soft-delete recovery across 7 entity types — entirely new; `league` had no settings surface or soft-delete at all.
- **Telegram mini-app** (`/telegram/turni`) — a standalone Bo3 round-timer/score tool for the Telegram bot's WebApp — entirely new.
- **Tesseramento** (`/tesseramento`) — public self-service 9-step membership registration/renewal wizard with Supabase OTP — entirely new (`league`'s only public-facing surface was the login page itself).
- **Guided tours** — `useTour`/`TourGuide`/`TourSpotlight` and ~20 domain-specific tour composables — entirely new onboarding layer.
- **Notifications** — bell + slideover (currently mock/placeholder actions) — entirely new.
- **Multi-format tournament support** — `league` only ever ran Commander pods. `app` adds:
  - **Swiss/1v1** (`SwissRoundManager`, `SwissTablePreviewModal`, `useSwissPairing`, `useSwissRoundCount`) — but explicitly **Phase 1 only**: pairings + advance/turn-back, no result entry or standings yet.
  - **Draft** (`PodsManager`, `useDraftPods`) — pod-formation preview only, no persistence, and no downstream round flow (`RoundManager`/`Leaderboard`/`Participants`/`RoundResults` are all unimplemented stubs for non-Commander formats).
- **Public subdomains** (`calendario.pauperwave.org`, `cittadino.pauperwave.org`) reusing internal components in no-auth mode — entirely new distribution model.

## Summary

`app` is not a rewrite of `league` so much as `league`'s Commander-tournament engine (pairing optimizer, kill tracker, voting, scoring, standings) transplanted wholesale into a much larger club-management platform — membership, finance, venues, events, and multi-format tournament support that `league` never attempted. The trade-offs worth flagging for anyone porting more logic over or auditing `app`'s completeness:
1. **Ruleset configurability regressed** — `league`'s per-league scoring editor became a static rules page in `app`; scoring is currently hardcoded to one default ruleset regardless of which ruleset a league displays.
2. **Deck-browsing UX regressed** — `league`'s dedicated deck/pairing browsing pages (`/decks`, `/deck/[slug]`) have no `app` counterpart; only per-player deck lists survive.
3. **Non-Commander tournament formats are mid-migration** — Swiss and Draft have UI scaffolding but incomplete backend flows (no Swiss scoring/standings, no Draft round progression).
4. **Dev-instrumentation regressed** — the button-click action log was dropped; only the visual developer-view overlay survived the port.
