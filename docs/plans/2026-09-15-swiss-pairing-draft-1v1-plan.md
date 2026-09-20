# Swiss pairing for Draft and 1v1 formats — build plan

<!-- docs/plans/2026-09-15-swiss-pairing-draft-1v1-plan.md -->

Commander is the only format with a real round-management flow today (pairing, results, standings). Draft has only its pod-formation step (`PodsManager.vue`); everything past that, and every plain-Swiss format (Pauper/Legacy/Modern/etc.), still falls through to the placeholder `RoundManager.vue` stub. Confirmed via research: `MagicTheGathering/league` has **no** Swiss/1v1 pairing system to port from — it's Commander-only. This is new-feature work, not a port.

Draft and 1v1 share the same round mechanic once seated (best-of-3 head-to-head, standard Swiss pairing) — Draft's only difference is the existing pod stage before round 1. So this plan builds one Swiss engine used by both, gated the same way Commander's pods step is (`isDraft.value || is1v1Format.value` instead of `isCommander.value`).

## Status (2026-09-20)

All three phases are built, with these differences from the text below:

- **Phase 3 has no `tournament_swiss_standings` table.** The standings are derived from pairings, match results and drops (`useLiveSwissStandings.ts`), see ADR-034 in `docs/PROGRESS.md`. Scoring is the official one (3/1/0, OMW% → GW% → OGW%, 0.33 floor) and is not configurable.
- **Byes and drops are in scope.** A bye is a single-player pairing scoring as a 2-0 win; the bye goes to the lowest-ranked active player without a previous bye. Drops are recorded per round with a timestamp and take effect from the next round (ADR-036).
- **`player_avoid_pairs` is not used**: the pairing only avoids rematches (`app/utils/tournaments/swissPairing.ts`).
- **Draft** still falls back to the placeholder round view: the round manager is gated on `is1v1Format`, which excludes Draft.
- **Awards:** the "Premi" step (Vittima, Carnefice, Master Brewer, Il Player) comes from kills and votes, so it exists only for Commander and is hidden for the other formats.

## What already exists and is reusable as-is

- **`tournament_rounds` / `tournament_pairings`** (`supabase/migrations/20260914000000_baseline_commander_tournament_schema.sql`) — already format-agnostic: `player1_uuid`..`player4_uuid`, `table_number`, `round_uuid`. 1v1 just uses `player1_uuid`/`player2_uuid`, leaving `player3_uuid`/`player4_uuid` null.
  - **Blocker to fix**: `ck_tournament_pairings_player_count` currently hard-requires at least 3 players (`player1 and player2 and player3 not null`). Needs a new check branch allowing exactly `player1_uuid`/`player2_uuid` set with `player3_uuid`/`player4_uuid` null.
- **`tournament_match_results`** (`supabase/migrations/20260906090000_create_tournament_match_results.sql` + the FK-naming-fix migration right after) — already built, unused until now. One row per pairing, `player1_games_won`/`player2_games_won` smallints, check-constrained to the 5 valid best-of-3 outcomes. This is exactly the 1v1 result-entry table — built ahead of time for "the future Telegram bot's `/vota` flow and any 1v1 standings work" per its own header comment. No schema changes needed here.
- **`player_avoid_pairs`** — keyed by player uuid pairs only, not tournament- or format-scoped. Directly reusable for Swiss rematch-avoidance the same way Commander's pairing optimizer already uses it.
- **`useSwissRoundCount.ts`** — round-count-by-player-count table, already generic (used today for both Commander and the stepper's round-count in general).
- **RPC-per-round-transition shape** (`start-round-one.post.ts` / `advance-round.post.ts` / `turn-back-round.post.ts` + their backing plpgsql RPCs) — the convention to copy: one Nitro route per lifecycle transition, each wrapping one atomic RPC that touches rounds/pairings/results together.
- **BFF/query-mutation split convention** — `use<Domain>Query.ts` (anon client, direct reads) + `use<Domain>Mutations.ts` (`$fetch` to `server/api/*.post.ts`, service-role client) — same pattern Commander's rounds infra already follows.

## What needs to be built fresh

Nothing here can be ported from league — it's genuinely new logic, designed from scratch against standard Swiss-tournament rules.

### 1. Pairing algorithm (`useSwissPairing.ts`, new composable)

Standard Swiss pairing, distinct from `pairingOptimizer.ts` (which is pod/multiplayer-weighted and not applicable to 1-v-1):
- Round 1: random or seeded pairing (reuse `AcceptancePickerItem`/`TablePlayer` shapes already used by Draft/Commander).
- Round N: bracket by current match points, pair within/adjacent brackets, avoid rematches (cross-check `tournament_pairings` history + `player_avoid_pairs`), standard "float up/down" resolution when a bracket has an odd player out.
- Bye handling for an odd total player count: a bye counts as a win for standings purposes but produces no `tournament_match_results` row (deliberately excluded by the existing `(0,0)` check-constraint exclusion — a bye needs its own signal, e.g. a nullable `pairing.player2_uuid` with `table_number null`, to be designed here since the current schema doesn't yet have one).

### 2. DB migration — loosen the pairings player-count constraint

One migration: replace `ck_tournament_pairings_player_count` with a version that also accepts the 2-player case. Decide the bye representation (see above) in the same migration if byes are in scope for v1.

### 3. Round lifecycle server routes (mirrors Commander's three)

- `start-round-one` (1v1 variant) — creates round 1 + random pairings, flips tournament to `in_progress` (same as Commander's does) — this is what Draft/1v1's new preview-confirm flow (already wired generically in `index.vue`) will call once it exists.
- `advance-round` (1v1 variant) — closes current round, computes standings-so-far, generates next round's pairings via `useSwissPairing.ts`.
- `turn-back-round` (1v1 variant) — same undo shape as Commander's.

Whether these become separate `-swiss` suffixed routes or the existing three routes branch on tournament format is a naming decision to make at implementation time — lean toward separate routes (`start-round-one-swiss.post.ts` etc.) to keep each RPC's transaction simple, matching how Commander's own routes aren't shared with anything else either.

### 4. Result-entry UI

A new component (name TBD, e.g. `SwissMatchResultForm.vue`) replacing Commander's ranking-drag-grid for a 1v1 table: pick games-won for player1/player2 (0-2/1-2/2-0/2-1/1-1), writes to `tournament_match_results` via a new `useTournamentMatchResultsMutations.ts`. Much simpler UI than the Commander ranking grid — no drag-and-drop needed, just two counters or a segmented control per table.

### 5. Standings/scoring (`useSwissScoring.ts`, new composable)

Standard Magic Swiss tiebreakers, none of which exist anywhere in this codebase yet:
- **Match points**: win = 3, draw = 1, loss = 0 (standard Magic Swiss scoring — confirm against this app's own house rules before hardcoding, in case Pauperwave uses a different point table like Commander's ruleset-driven `useRulesetPointsQuery.ts`).
- **OMW% (opponents' match-win %)**, **GW% (game-win %)**, **OGW% (opponents' game-win %)** — computed from `tournament_match_results` + `tournament_pairings` history, standard floor-of-33% per the official tiebreaker rules (each opponent's match/game win % is floored at 1/3 to avoid punishing a player for a very weak opponent).
- A `tournament_standings`-equivalent table/view for 1v1 — Commander's own `tournament_standings` table has Commander-shaped columns (`player_victories`, `votes_brew_received`, ...) that don't fit match points + 3 tiebreakers. Likely needs its own table (e.g. `tournament_swiss_standings`) rather than trying to overload the existing one, mirroring the match-results table's own reasoning for not overloading `tournament_round_results`.

### 6. Live/in-progress standings

A `useLiveSwissStandings.ts` equivalent to `useLiveCommanderStandings.ts`, recomputing from in-flight (not-yet-advanced) match results the same way Commander shows live standings mid-round.

## Suggested phasing

Given the size, split into three shippable chunks rather than one big feature branch:

1. **Pairing + round lifecycle** — DB migration, `useSwissPairing.ts`, the three server routes, wire Draft/1v1 into the stepper's `#pods`/`#round-${i}` slots the same way Commander is wired today. No scoring yet — round advance can use a placeholder/manual tiebreak order to unblock this phase.
2. **Result entry** — `SwissMatchResultForm.vue` + `useTournamentMatchResultsMutations.ts`, replacing the placeholder from phase 1.
3. **Scoring/standings** — `useSwissScoring.ts`, `tournament_swiss_standings`, `useLiveSwissStandings.ts`, wired into round-advance's real pairing-by-standings logic (phase 1's placeholder becomes real).

Phase 1 is the natural place to start — it's the only phase blocked on nothing else, and it's what turns Draft/1v1 from "completely stubbed" into "actually playable, manually re-orderable."
