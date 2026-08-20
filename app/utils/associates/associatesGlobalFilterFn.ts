// app\utils\associates\associatesGlobalFilterFn.ts
import levenshtein from 'fast-levenshtein'
import type { Row } from '@tanstack/vue-table'
import type { Associate } from '~/types'

// Shared UTable globalFilterFn for both associates/index.vue (roster) and
// associates/requests.vue (queue) — a single search box matching name,
// email, phone, and tax code (user feedback, 2026-08-19: the toolbar's
// search only ever matched email_address). Name/surname is fuzzy-matched
// (typo-tolerant via Levenshtein edit distance); email/phone/tax code stay
// exact-substring — a tolerance of 1-2 chars on those produces false
// positives fast (e.g. an email typo tolerance matching unrelated
// addresses), so only the name gets the forgiving match.
const normalize = (value: string) => value.toLowerCase()
const includesQuery = (value: string | null | undefined, query: string) =>
  !!value && normalize(value).includes(query)

// Bails to plain substring matching under 3 characters — fuzzy matching a
// 1-2 char query against every word matches nearly everything, which isn't
// useful and would swamp the roster's own quick single/double-letter checks.
// Normalizes fullName itself rather than trusting an already-lowercased
// caller — normalize() is idempotent, so repeating it costs nothing and
// keeps this function correct standalone (code review, 2026-08-19).
function nameMatches(fullName: string, query: string): boolean {
  const normalized = normalize(fullName)
  if (normalized.includes(query)) return true
  if (query.length < 3) return false

  // Multi-word queries (e.g. "john doe") fall through to the substring
  // check above — levenshtein.get() compares single tokens, so "john"
  // against the whole query "john doe" is a large distance and never
  // matches per-word here.
  const tolerance = query.length <= 4 ? 1 : 2
  return normalized.split(/\s+/).some(word => levenshtein.get(word, query) <= tolerance)
}

export function associatesGlobalFilterFn(
  row: Row<Associate>, _columnId: string, filterValue: string
): boolean {
  const query = filterValue.trim().toLowerCase()
  if (!query) return true

  const {
    first_name, last_name, email_address, phone_number, tax_code
  } = row.original
  const fullName = `${first_name} ${last_name}`

  return nameMatches(fullName, query)
    || includesQuery(email_address, query)
    || includesQuery(phone_number, query)
    || includesQuery(tax_code, query)
}
