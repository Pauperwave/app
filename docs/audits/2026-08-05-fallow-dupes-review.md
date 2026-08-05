# Fallow dupes review (2026-08-05)

<!-- docs/audits/2026-08-05-fallow-dupes-review.md -->

`pnpm run fallow:dupes` was run after adding `.fallowrc.json` to exclude the generated `app/types/database.types.ts` from clone detection (that file alone accounted for 11 of 25 clone groups / ~560 of 1,012 duplicated lines — pure noise, not real duplication). With it excluded: **14 clone groups, 452 lines (7.6%) duplicated across 14 files.**

**Conclusion: premature to act on any of it right now.** Recorded here so the reasoning isn't lost, not as a to-do list.

## What was found, and why it's not (yet) worth fixing

| Group | What | Verdict at review time | Why |
|---|---|---|---|
| `associates/index.vue:124-158` ↔ `tournaments/index.vue:528-543` | `createVisibilityItem`/`getVisibilityItems` ("Mostra colonne" dropdown) — byte-identical modulo the generic type param | Real candidate, deferred | Only 2 occurrences today. Worth a `useColumnVisibilityItems<T>()` composable once a third table page needs it, not before. |
| `associates/index.vue:166-185` ↔ `tournaments/index.vue:133-152` | TanStack Table `select` checkbox column boilerplate, identical | Real candidate, deferred | Same reasoning — standard Nuxt UI docs pattern, low risk either way. |
| `transactions`/`events`/`leagues`/`tournaments` `index.vue:8-21` (4 instances) | `route`/`router`/`isModalOpen` + `onMounted(() => { if (route.query.action === 'create') ... })` | Real candidate, deferred | Already at 4 identical instances — the strongest case found. Still deferred: extracting a `useCreateModalFromQuery()` now is app-wide surface area for a bug-fix session that was scoped to the associates table and dependency stability, not refactors (see `docs/PROJECT_ANALYSIS.md`'s and `CLAUDE.md`'s stated priority: stabilize `app`, prepare its DB as `league`'s future base). |
| `HomeDateRangePicker.vue:50-79` ↔ `88-121` (same file) | `startDate`/`endDate` computation from a `range` object, duplicated inside `isRangeSelected` and `selectRange` | Real candidate, deferred | The most legitimate one — same logic duplicated *within one file*, real risk a future date-range bugfix only gets applied to one of the two functions. Still not touched: unrelated to anything currently in flight, no reported bug here. |
| `events`/`leagues`/`transactions` `AddModal.vue` (multiple groups, 17-21 lines) | Nearly identical scaffold: generic `name`+`email` schema that doesn't even match the domain (a "league" modal with an email field) | **Not worth fixing at all**, not just deferred | These are placeholder components backed by mock data (`docs/architecture/api.md`) — leagues/events/transactions aren't real CRUD yet. Any shared abstraction built now would need to be rebuilt once these features get real schemas/forms. Abstracting stub code is negative value. |
| `server/api/leagues.ts` ↔ `tournaments.ts` (mock data generators) | Same `Array.from({ length: 30 }, ...)` date-increment pattern | **Not worth fixing at all** | Same reasoning — temporary mock data generators, not product logic. Will be deleted, not deduplicated, once real endpoints exist. |
| `statistics/decks.vue` ↔ `statistics/index.vue` (14 lines) | Not inspected in detail | Below relevance threshold | Small (14 lines, 2 instances) — revisit only if a third occurrence shows up. |
| `transactions/index.vue:33-47` ↔ `tournaments/index.vue:622-636` (15 lines) | Not inspected in detail | Below relevance threshold | Same reasoning. |

## Standing principle

Per `CLAUDE.md`'s DRY guidance: don't abstract on sight of the second occurrence. The 4-instance `?action=create` pattern and the same-file `HomeDateRangePicker` duplication are the only two groups that actually clear that bar on their own merits — everything else either hasn't (2 occurrences of otherwise-stable code) or is duplicating throwaway scaffolding that will be replaced, not refactored, when the underlying feature becomes real.

**Current priority stands as stated in `docs/PROGRESS.md`/`CLAUDE.md`: stabilize `app` and prepare its DB as the future base for `MagicTheGathering/league`, not structural refactors.** Revisit this file if/when that priority changes, or if any of the "deferred" rows above gain a third occurrence.
