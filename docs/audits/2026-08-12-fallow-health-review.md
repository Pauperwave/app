# Fallow health review (2026-08-12)

<!-- docs/audits/2026-08-12-fallow-health-review.md -->

> **Superseded by [`2026-08-16-fallow-health-review.md`](./2026-08-16-fallow-health-review.md).** Kept for history — two of this review's three deferred targets (`GridView.vue`, `tesseramento/index.vue`) were addressed in the follow-up session; see the new audit for current numbers and open items.

`pnpm run fallow:health` (`fallow health --score --hotspots --targets`) was run against the full codebase (16,531 LOC, 882 functions analyzed across 161 files).

**Health score: 80 (B).** Maintainability index 94.4 ("good"), 0% dead files/exports, 0.4% duplication (down from ~7.6% after the 2026-08-05 through 2026-08-12 dupe-resolution work, see `2026-08-05-fallow-dupes-review.md`). The two deductions (`-10` hotspots, `-10` unit size) both trace back to the same handful of files, not a systemic problem.

**Conclusion: no action needed right now.** Recorded here so the reasoning isn't lost, not as a to-do list — see the standing principle at the bottom.

## Where the score is coming from

### Unit size (-10)

51 functions exceed 60 lines; the top 10 are almost entirely Vue SFC `<template>` blocks (fallow counts a whole `<template>` as one function):

| File | Size |
|---|---|
| `transactions/list/AddModal.vue` | 505 lines |
| `layouts/default.vue` | 504 lines |
| `tournaments/list/AddModal.vue` | 436 lines |
| `tesseramento/index.vue` | 421 lines |
| `wanted-cards/index.vue` | 368 lines |
| `associates/index.vue` | 352 lines |
| `associates/requests.vue` | 258 lines |
| `useAssociateTableColumns.ts` (`useAssociateTableColumns`) | 254 lines |
| `associate/[slug].vue` | 225 lines |
| `useWantedCardsRowActions.ts` (`useWantedCardsRowActions`) | 212 lines |

Most of these are large CRUD modal forms (`AddModal.vue` × 2) or big multi-column data tables (`associates/index.vue`, `wanted-cards/index.vue`) — the template length reflects genuinely large forms/tables, not tangled logic. `useAssociateTableColumns` is a deliberate aggregation point (built 2026-08-11 specifically to deduplicate column definitions shared by `associates/index.vue` and `requests.vue` — see the dupes review); its size is the flip side of removing that duplication, not a regression.

### Hotspots (-10)

Only 1 file crosses fallow's hotspot bar (high churn *and* high complexity together, last 6 months): `app/pages/(community)/associates/index.vue` (23 commits, 1413 churn, complexity score 64.3, still `▲ accelerating`). This tracks — it's had the heaviest sustained work all session (UX split from `requests.vue`, column dedup, header/footer/toolbar extraction, checkbox alignment fix). `app/layouts/default.vue` (34.0, `─ stable`) and `associate/[slug].vue` (18.7, `▲ accelerating`) are next but below the hotspot threshold.

None of the three are flagged as **refactoring targets** below, i.e. fallow itself doesn't think their current complexity/churn combination is worth a restructuring pass yet.

## Refactoring targets (3) — reviewed, not actioned

fallow's own ROI-ranked list, separate from the raw complexity/hotspot dumps above:

| Score | File | What | Verdict |
|---|---|---|---|
| 10.0 (high) | `app/utils/error.ts` | "Split high-impact file (14 LOC), 5 dependents amplify every change" | **False-positive-shaped, not worth acting on.** The file is two trivial, stable, pure functions (`toErrorMessage`, `isConflictError`) with 5 importers — high fan-in here is what a well-factored shared util is *supposed* to look like, not a coupling risk. "Split" doesn't make sense for a 14-line file. |
| 8.4 (medium) | `app/components/wanted-cards/list/GridView.vue` | Extract `<template>` (cognitive 50) in a 147-LOC file | Real candidate, deferred. Genuinely the densest `<template>` per LOC in the codebase (cognitive complexity 50 in ~120 template lines) and has 1 fan-in (`wanted-cards/index.vue`). Worth a look if this file gets touched again for a feature reason, not on its own. |
| 6.5 (medium) | `app/pages/(public)/tesseramento/index.vue` | Extract `<template>` (cognitive 39) in a 422-LOC file | Real candidate, deferred. Same category as the `AddModal.vue` files above — a large multi-step public form. Already had its duplicated field-groups extracted into `app/components/associates/fields/*` this session; the remaining size is step-switching template logic, not duplication. |

## Standing principle

Same posture as the 2026-08-05 dupes review: **don't refactor on a raw complexity number alone — check whether the size reflects genuine feature surface (a big form, a big table) before treating it as debt.** Of the three fallow-ranked targets, one (`error.ts`) is a clear non-issue, and the other two are legitimate but low-urgency (no hotspot status, no bug history, `effort:medium`/`confidence:high` rather than urgent). Revisit this file if any of the three gain hotspot status (churn + complexity both rising) or if `associates/index.vue`'s hotspot score keeps accelerating past the next few sessions.
