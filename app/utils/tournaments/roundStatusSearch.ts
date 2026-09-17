// app\utils\tournaments\roundStatusSearch.ts
// Ported near-verbatim from MagicTheGathering/league's roundStatusSearch.ts
// (user request, 2026-09-19) — framework-free, unit-testable filter/search
// helpers backing RoundStatusCard.vue's "Stato inserimento" sidebar.

/**
 * The status filter for RoundStatusCard.vue. No "in progress" state today —
 * there's no real-time "who is filling this in right now" data, only a
 * binary done/not-done per row (same gap league itself documents).
 */
export type RoundStatusFilter = 'all' | 'pending' | 'done'

/** True if `done` should be shown under the given status filter. */
export function matchesRoundStatusFilter(done: boolean, filter: RoundStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'done') return done
  return !done
}

/** Case-insensitive substring match; an empty/whitespace-only query always matches. */
export function matchesRoundStatusSearch(haystack: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return haystack.toLowerCase().includes(trimmed)
}

/**
 * Search haystack for a table number — matches both a bare "1" and the
 * translated heading ("Tavolo 1"). `tableHeading` is the already-resolved
 * i18n string so this stays free of `useI18n()` and unit-testable.
 */
export function tableSearchLabel(tableNumber: number, tableHeading: string): string {
  return `${tableNumber} ${tableHeading}`
}
