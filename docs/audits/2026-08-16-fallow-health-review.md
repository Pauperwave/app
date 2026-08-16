# Fallow health review (2026-08-16)

<!-- docs/audits/2026-08-16-fallow-health-review.md -->

Supersedes `2026-08-12-fallow-health-review.md` — most of what that review deferred got addressed this session (see below), and the remaining targets needed a fresh look rather than a stale "reviewed, not actioned" note.

`node scripts/fallow-health-report.mjs` (`fallow health --score --hotspots --targets --complexity`) run against the full codebase (378 files analyzed, 1,396 functions).

**Health score: 79.5 (B).** Maintainability average 94.1, avg cyclomatic 2.1, duplication 0.2% (down further from 2026-08-12's 0.4%, see the fallow:dupes cleanup earlier this session). The two deductions (`-10` hotspots, `-10` unit size, `-0.5` coupling) trace to the same handful of files as before, not a systemic problem.

## What changed since 2026-08-12

Two of that review's three targets got real fixes this session, both by extracting the actual branching/markup into dedicated components rather than chasing the number directly:

- **`wanted-cards/list/GridView.vue`** ("real candidate, deferred") — extracted the per-card `v-for` body into `GridCard.vue`. Cognitive complexity 50 → the `<template>` finding is gone entirely from `fallow:health`.
- **`app/components/calendar/DetailSlideover.vue`** (not yet a `<template>` file at the time of the 2026-08-12 review — added later) — split into `EventDetailContent/Hero.vue` + `TournamentDetailContent/Hero.vue`. Cognitive complexity 30 → gone entirely.
- **`tesseramento/index.vue`** ("real candidate, deferred") — extracted the 3 steps with real markup of their own (email/verify/consents) into their own components. LOC dropped 421 → 326, but **the cognitive-39 `<template>` finding did not move** — see "Still open" below for why.
- **`app/utils/error.ts`** — the 2026-08-12 review already called this a non-issue ("high fan-in here is what a well-factored shared util is *supposed* to look like"). Confirmed again this session, independently, before finding the earlier note. Still flagged by `fallow:targets`, still not worth acting on — see below.

Also fixed one real false-positive along the way: `app/composables/useScryfallCardSearch.ts`'s `toPrinting()` was flagged cyclomatic 26, entirely from `??`/`?.` operators (no `if`/`switch`/loop) reflecting Scryfall's inconsistent card-face API shape. Suppressed with `// fallow-ignore-next-line complexity` — verified via `fallow-health-report.mjs` that the finding is actually gone, not just annotated (the marker comment has to be the single line immediately above the function, not the first line of a multi-line explanation, or fallow doesn't match it — same alignment issue as `fallow-ignore-next-line code-duplication` had earlier this session, see `PROGRESS.md`).

## Refactoring targets (4) — reviewed, not actioned

| Priority | File | What | Verdict |
|---|---|---|---|
| 30 (highest) | `app/utils/error.ts` | "Split high-impact file (14 LOC), 20 dependents amplify every change" | **False economy**, same conclusion as 2026-08-12 (dependents grew 5 → 20, verdict unchanged). Two tiny, stable, pure functions — splitting a 14-line file used everywhere would scatter genuinely related code for zero complexity benefit. |
| 24.6 | `app/composables/useSelection.ts` | "Split high-impact file (85 LOC), 15 dependents amplify every change" | **False economy.** Of the 15 dependents, all are `import type { Selection }` — type-only, not calling the logic that would actually be affected by a split. One cohesive, genuinely single-responsibility composable (selection state + shift-range + Escape-to-clear). If anything worth doing: extract `toggle()`'s shift-range branch into a named helper for readability, not a file split. |
| 22.3 | `app/utils/cardColors.ts` | "Split high-impact file (120 LOC), 3 dependents amplify every change" | **Marginal, genuinely borderline** — `complexity_density` 0.31 barely clears the 0.3 threshold. All 6 exports are legitimately the same concern (MTG color identity: ordering, comparing, rendering). fallow's own confidence rating is "medium," not "high" like the two real wins above. Could split into sorting-vs-visual concerns if it gets touched again for a feature reason; not on its own. |
| 15.6 | `app/pages/(public)/tesseramento/index.vue` | "Extract `<template>` (cognitive: 39) in 326-LOC file into smaller functions" | **Still open, deliberately.** Template cyclomatic/cognitive here is driven by the *count* of `v-if`/`v-else-if` branches (9, one per wizard step), not by how much markup sits inside each branch — the 3 steps already extracted (email/verify/consents) had no internal branching to remove, so LOC dropped but the count didn't. Fully collapsing it means converting all 9 steps to a `<component :is="...">` dynamic dispatch — but email/verify have their own action buttons and no shared footer (unlike steps 3-9), so unifying that prop/emit contract across all 9 would trade real readability for the metric. Revisit only if a 10th step or a genuine dynamic-step requirement makes the dispatch pattern earn its keep on its own. |

## Standing principle

Same posture as 2026-08-05/2026-08-12: **don't refactor on a raw complexity number alone — check whether the number reflects genuine tangled control flow (worth fixing) or just file size / fan-in / operator density on otherwise-simple code (not worth it) before touching anything.** Of the 4 current targets, one is a repeat false-economy call from the last review, two are newly-confirmed false economy, and one (`tesseramento/index.vue`) is a real but not-worth-it-yet structural tradeoff, documented so the reasoning isn't re-derived from scratch next time. Revisit if any of these four gain hotspot status, or if `fallow-health-report.mjs`'s `--top` targets list picks up a genuinely new, high-confidence `<template>`-extraction candidate the way `GridView.vue`/`DetailSlideover.vue` were this session.
