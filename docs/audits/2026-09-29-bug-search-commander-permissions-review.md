# Bug search: Commander Telegram flow, ruleset dupes, 1v1/prizes/permessi (2026-09-29)

<!-- docs/audits/2026-09-29-bug-search-commander-permissions-review.md -->

User request: "read the codebase and search for potential bugs" — a general, unprompted pass (no specific symptom reported), run in two stages: manual review of the most recently written, least-tested code (the real Commander Telegram flow, added 2026-09-24/25) plus `fallow:health`/`fallow:security`/`fallow:dead-code`, then a wider fork-assisted sweep of the 1v1 Swiss flow, prize distribution, and permissions/RLS.

## Fixed

### 1. Unstable opponent ordering could misattribute a Commander kill/vote (high severity, fixed)

`server/utils/telegram/commands/tournaments/commanderPodData.ts`'s `fetchLivePod` resolved a pod's opponents with `.in('uuid', opponentUuids)` and **no `.order()`** — Postgres gives no ordering guarantee for an `IN` filter without an explicit sort. `server/utils/telegram/commands/tournaments/commanderReport.ts` encodes a kill/vote target as an **index** into that array (to fit inside Telegram's `callback_data` length limit, the same reason `matchReport.ts` encodes a 1v1 outcome as an index rather than a full score pair) — but unlike the 1v1 flow, `requirePod(ctx)` re-runs `fetchLivePod` from scratch on every single tap, including the tap that reads the index back. Without a stable sort, the same index could silently resolve to a **different opponent** between the message's render and the button press that reads it — recording a kill or a deck/play vote against the wrong player, with no error and no visible sign anything went wrong.

Fix: added an explicit `.order('uuid', { ascending: true })` to the opponents query, so the array order is deterministic and identical across calls for the same pod. Also added payload validation for `POS_PICK_PREFIX`/`KILL_TOGGLE_PREFIX` (previously relied only on the DB's own check/FK constraints rejecting a malformed position or an empty `killed_player_uuid`), matching the stricter validation style `matchReport.ts`'s own `parsePayload`/`requireOutcomeIndex` already use. Commit `521c9281`.

### 2. `useRulesetPointsQuery.ts` / `rulesetPoints.ts` near-identical clones (low severity, fixed)

`fallow:health` flagged `app/composables/tournaments/useRulesetPointsQuery.ts` (client, Pinia Colada) and `server/utils/tournaments/rulesetPoints.ts` (server, the Telegram bot's own score summary) as near-identical clones — both independently rebuilt the same `ruleset__points` rows → `RulesetPointValues` mapping block. Already flagged as a known, "kept in sync manually" risk in ADR-045 (`docs/PROGRESS.md`) when the server copy was written, i.e. a real drift risk if one is edited without the other.

Fix: extracted the shared mapping into `shared/utils/tournaments/rulesetPoints.ts`'s `mapRulesetPoints()`, called from both files (the surrounding fetch logic genuinely can't merge further — one reads already-cached Pinia Colada queries, the other does raw Supabase calls). `app/composables/rulesets/useRulesetsWithPointsQuery.ts` (the `/rulesets` management tab, a third near-duplicate of the same 7-field block plus its own `participation` field) now reuses it too. Commit `e8a5db9d`.

## Reviewed, no fix needed

**1v1 Swiss flow** (`matchReportData.ts`, `matchResults.ts`, `shared/utils/tournaments/matchReport.ts`, `useSwissRoundData.ts`, `swissPairing.ts`, `swissScoring.ts`) — clean. No index-encoding risk equivalent to finding 1 above: a 1v1 pairing has exactly one opponent, nothing to mis-index. Payload validation (`parsePayload`, `requireOutcomeIndex`) already rejects malformed `callback_data`. `swissScoring.ts` matches MTR scoring rules correctly (bye handling, percentage floors, opponent-average exclusion).

**Prize distribution** (`prizeAllocation.ts`, `prizeShares.ts`, `prizeLimits.ts`, `prizeBudget.ts`) — no confirmed bugs. The water-filling allocation loop and its cap-pinning logic are self-consistent; traced for infinite-loop risk at both extremes (`bonusCap = 0`, `bonusCap = Infinity`) and both terminate correctly. Already has dedicated test coverage (`test/unit/utils/tournaments/prizes/prizeAllocation.test.ts`), which lowers residual-bug likelihood.

**Permissions** — well-centralized, no bypass found. Every `server/api/**/*.ts` mutation endpoint swept; all funnel through `requireManagementPermission`/`requireAdminPermission`/`requireSuperAdminPermission`, directly or via a shared helper (`parseIdRequest`, `parseIdMutationRequest`, `updateAssociateById`, `bulkUpdateMembershipRequestStatus`, `requireManagementOrWantedCardOwner`). No endpoint found skipping the check a sibling endpoint in the same domain has.

## Flagged for a decision, not fixed

### `pauperwave_wanted_cards` INSERT RLS accepts any authenticated caller's own `player_associate_uuid` claim

`supabase/migrations/20260807200045_open_wanted_cards_insert_to_authenticated.sql`:

```sql
create policy "Authenticated users can insert wanted cards"
  on public.pauperwave_wanted_cards
  for insert
  to authenticated
  with check (true);
```

`with check (true)` — no constraint that `player_associate_uuid` on the inserted row actually matches the caller's own associate. The app itself is not at risk today: `useWantedCardsMutations.ts`'s `createWantedCard` always POSTs to `/api/wanted-cards/create` (service role, BFF boundary), never the anon client directly. But the policy is live on the database regardless — any authenticated user calling Supabase directly with their own session (trivially available from the browser's own network tab, no special access needed) could insert a wanted-card request **attributed to a different associate's uuid**, bypassing the app's UI entirely.

This is consistent with the project's own stated convention (the BFF is the real authorization boundary; RLS is defense-in-depth, not the primary gate — see `server/utils/serverAuth.ts`'s usage pattern throughout) and the migration's own comment explains the *access* intent ("any player can freely request") — it just never constrains *whose identity* the request is filed under. Likely an accepted gap rather than an oversight, but flagged since it's the one place in the schema where `with check (true)` combines with a column that can spoof another person's identity, rather than just being permissive about *what* gets written.

**Not fixed — pending a decision**: tighten the policy to `with check (player_associate_uuid = (select uuid from pauperwave_associates where user_id = auth.uid()))` (same shape as this project's other player-self-service `with check` clauses, e.g. the Commander self-service policies from migration `20260914000001`), or leave as-is if the spoofing risk for this specific low-sensitivity table (a wanted-card request, not payment/membership data) is judged not worth the extra RLS complexity.

## See also

- `docs/PROGRESS.md` — ADR-042 (Commander schema), ADR-044/ADR-045 (real Telegram flows for 1v1 and Commander)
- `docs/architecture/telegram-bot.md` — the real Commander flow's own row, updated alongside the fixes above
