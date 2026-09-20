# Prize distribution (booster packs)

<!-- docs/architecture/prize-distribution.md -->

How the "Distribuzione premi" stepper step (`app/components/tournaments/single/Prizes.vue`) turns a pool of booster packs into a per-placement suggestion for the final standings: what the rules are, where each one lives, and what the UI does with them. The decision record is ADR-039 in `PROGRESS.md`; this doc is the detailed reference.

## What it is (and isn't)

- A **suggestion the organizer adjusts on screen while handing out boosters** — it is **not persisted** (user decision, 2026-09-17): the settings live in a local ref and reset when the component remounts. The one exception is the organizer's own "custom" shares (see "Presets, custom and reset").
- It works on any standing that has `associateUuid` + `label` in final rank order (index = placement), so it serves both the Commander standings and the 1v1 Swiss ones (ADR-034).
- Nothing here talks to Supabase: no table, no BFF route, no query key.

## Where things live

Pure logic first, Vue on top — the rules are unit-tested without mounting anything.

| Layer | File | Job |
|---|---|---|
| Rules | `app/utils/tournaments/prizes/prizeBudget.ts` | `prizeBudgetOf`: the pools (distributable, rewarded, bonus) and the effective per-placement cap |
| Rules | `.../prizeAllocation.ts` | `computePrizeDistribution` (the split), the defaults, `isDefaultPrizeSettings` |
| Rules | `.../prizeShares.ts` | `sharesForPackEdit` (moving packs between placements), `packRangeOf` (what a row can reach) |
| Rules | `.../prizeLimits.ts` | `prizeSettingsLimits`, `prizeLimitStates` (which control sits at a bound), `prizeResetTargets`, `resolveMaxPacksPerPlayer` |
| State | `app/composables/tournaments/prizes/usePrizeDistributionPage.ts` | the settings ref, the rows, the chart data, `updatePacks`/`stepShare`/`resetSettings` |
| State | `.../usePrizeDistributionPresets.ts` | preset detection/apply + the saved "custom" shares (VueUse `useStorage`) |
| State | `.../usePrizeDistribution.ts` | thin reactive wrapper over `computePrizeDistribution` |
| UI | `Prizes.vue` | layout only |
| UI | `prizes/PrizeDistributionSettings.vue`, `...Chart.client.vue`, `...Table.vue`, `...Row.vue`, `...PresetButtons.vue` | the panels |
| Shared UI | `ui/HintedNumberField.vue`, `ui/PresetButtons.vue`, `ui/ValueStepper.vue`, `composables/useChangeFlash.ts` | generic pieces extracted along the way (listed in `ui/CLAUDE.md`) |

## The settings

`PrizeDistributionSettings` (`app/types/index.d.ts`), defaults in `DEFAULT_PRIZE_DISTRIBUTION_SETTINGS` — the defaults are the reference example: 34 packs, minimum 3 for the top 8, bonus 40/30/20/10 → `7 6 5 4 3 3 3 3`.

| Field | Default | Meaning |
|---|---|---|
| `totalPacks` | 34 | every pack available, including the ones set aside |
| `reservedPacks` | 0 | packs given to nobody (a raffle, the shop); taken off the total first |
| `minPacksPerPlayer` | 3 | guaranteed to each **rewarded** placement |
| `nonRewardedMinPacks` | 0 | guaranteed to each player **outside** the rewarded placements (participation packs) |
| `topCutoff` | 8 | how many placements are rewarded (capped by the player count) |
| `maxPacksPerPlayer` | 7 | most a single placement can receive; `0` = no cap |
| `bonusShares` | `[40,30,20,10,0,…]` | percent of the bonus pool per rank (rank 0 = 1st); missing ranks count as 0 |

## How the packs are split

1. `distributable = totalPacks − reservedPacks`.
2. Every non-rewarded player gets `nonRewardedMinPacks`; the rest is the **rewarded pool**.
3. Every rewarded placement gets `minPacksPerPlayer`; what remains is the **bonus pool**.
4. The bonus is split by `bonusShares` (renormalized, so they needn't sum to 100; if every share is 0 it is split evenly) with the **largest-remainder** method, so the counts always sum exactly to the pool — never a pack lost to float rounding.
5. A placement that would exceed the cap keeps the cap and its surplus is re-split among the others (water-filling). A cap too low to hold every pack (`cap × rewarded < rewarded pool`) is **ignored**, so no pack is left unassigned.

## The constraints

- **Every pack is assigned:** assigned + reserved = `totalPacks`, always.
- **Bounds per placement:** between `minPacksPerPlayer` and the cap (or the whole bonus pool if there's no cap).
- **Order:** a lower placement never has more packs than a higher one — at most as many. This includes the groups: `nonRewardedMinPacks` can never exceed `minPacksPerPlayer`.
- **Whole packs:** every edit moves whole packs; a share is never finer than a pack.

## Limits of the controls

`prizeSettingsLimits` keeps the combination payable and ordered, so the +/− of each control disables exactly at its bound (`prizeLimitStates` says which one, and the tooltips explain why):

- **Total** — at least `min × rewarded + nonRewardedMin × nonRewarded + reserved`.
- **Rewarded minimum** — at most what the total can pay to all rewarded; at least `nonRewardedMinPacks` (only while someone is outside the rewarded).
- **Non-rewarded minimum** — at most the packs left after the rewarded minimum, split over the non-rewarded, **and never above the rewarded minimum**; disabled if everyone is rewarded.
- **Reserved** — at most the packs the minimums don't need.
- **Rewarded placements** — from 1 up to what the total affords at the minimum.
- **Cap** — `0`, or at least the lowest cap that can hold every rewarded pack (`resolveMaxPacksPerPlayer`: a value below it jumps up to it, or back to 0 when lowering).

## Editing a placement

Both the row's share stepper and the pack field go through `sharesForPackEdit`; the share stepper is just "packs ± 1".

- Packs move **one at a time**. The giver is the **highest placement** (other than the one edited) that has packs above the minimum and whose loss keeps the order valid; the taker is the highest one under the cap that can take it without breaking the order. So `7 6 5 4 3 3 3 3` → +1 on #5 gives `6 6 5 4 4 3 3 3` (the #1 gives), never a #5 above the #4.
- A placement can therefore only move between its neighbours and the bounds: `packRangeOf` computes the range each row can actually reach, and the row's stepper and pack field disable at it (typed values are clamped).
- The share shown next to each row is **derived from the packs it really gets** (`(packs − min) / bonus pool`), not the nominal share — so it stays true with rounding, caps and minimums. Editing derives new shares from the resulting packs, which reproduce that distribution exactly.
- Non-rewarded rows show what they receive and can't be edited.
- Going back down one step usually restores the previous state, but not always (e.g. when the top placement was already at the minimum, the pack can return to a different one).

## Presets, custom and reset

- **Presets** ("Equa", "Bilanciata", "Competitiva") only replace `bonusShares`; "Bilanciata" is `40/30/20/10`. They keep their nominal shares until a step snaps them to whole packs.
- **Custom** ("Personalizzato") restores the organizer's last hand-edited shares. Every share/pack edit saves them to `localStorage` (key `prize-distribution-custom-shares`, not per tournament); the button is disabled until something is saved.
- **Reset** ("Ripristina") puts every setting back to its starting value and keeps the saved custom shares; it's disabled while everything already equals the defaults (`isDefaultPrizeSettings`, with a float tolerance on the shares).
- Each setting also has its own reset button, right of its +/−: the starting value, or the closest one the other settings allow (`prizeResetTargets` — e.g. the total can't drop below what the minimums need).

## The screen

- **Left:** the settings (three columns: packs / minimums / placements, each with an "i" tooltip saying what it does), then the chart of packs per rewarded placement with dashed reference lines for the minimum, the non-rewarded minimum and the cap.
- **Right:** the presets with reset/custom, "Buste distribuite: X su Y" (plus the reserve if any), then the standings. Players outside the rewarded placements sit in a collapsible section, closed by default.
- Rows whose packs just changed tint green (gained) or red (lost) for a moment (`useChangeFlash`).

## Gotchas

- `UInputNumber` drops the listeners `UTooltip`'s trigger passes to its root (same as `UChip`), so its tooltip never opened until it was wrapped in a native `div` — `HintedNumberField` does this.
- The pure rules live in `app/utils/**`, which Nuxt auto-imports; after moving or adding an export, a running dev server can keep a stale registry (see the note in the auto-import section of the root `CLAUDE.md` and `memory`): force a rescan or restart `pnpm dev`.

## Tests

126 unit tests, all pure or composable-level (no component tests, per `testing.md`):

- `test/unit/utils/tournaments/prizes/` — `prizeAllocation` (22: the split, the cap, non-rewarded and reserved, defaults), `prizeBudget` (4), `prizeLimits` (38: every limit and tooltip state, reset targets, the minimums order), `prizeShares` (25: who gives/takes, ordering invariant over long step sequences, `packRangeOf`).
- `test/unit/composables/tournaments/prizes/` — `usePrizeDistributionPage` (24: rows, real shares, chart guides, steps, reset, custom) and `usePrizeDistributionPresets` (13).
- Related helper tests: `useChangeFlash` (6).

## Known limits

- Not persisted: reloading the page loses the settings (by design). A "custom" saved by an older version could have shares that don't respect the order; `computePrizeDistribution` itself doesn't enforce it — the controls do.
- Only the Italian locale exists; the labels live under `tournament.single.prizeDistribution.*` in `i18n/locales/it.json`.
