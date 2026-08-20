// app\utils\players\playersGlobalFilterFn.ts
import type { Row } from '@tanstack/vue-table'
import type { Player } from '~/types'

// UTable globalFilterFn for /players (2026-08-19 user request, "similar
// search" to associates' associatesGlobalFilterFn.ts) — matches nickname,
// first/last name, and email. Plain substring, no fuzzy matching: the
// roster this searches is small and associates' Levenshtein fuzzy-match was
// specifically about typo-tolerant real names, not requested here.
export function playersGlobalFilterFn(
  row: Row<Player>, _columnId: string, filterValue: string
): boolean {
  const query = filterValue.trim().toLowerCase()
  if (!query) return true

  const {
    nickname, first_name, last_name, email_address
  } = row.original

  return !!nickname?.toLowerCase().includes(query)
    || !!first_name?.toLowerCase().includes(query)
    || !!last_name?.toLowerCase().includes(query)
    || !!email_address?.toLowerCase().includes(query)
}
