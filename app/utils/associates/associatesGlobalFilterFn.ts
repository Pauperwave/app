// app\utils\associates\associatesGlobalFilterFn.ts
import levenshtein from 'fast-levenshtein'
import type { Row } from '@tanstack/vue-table'
import type { Associate } from '~/types'

// Shared UTable globalFilterFn for associates/index.vue (roster) and requests.vue (queue): one
// search box matching name, email, phone and tax code. Only the name is fuzzy (Levenshtein): a 1-2
// char tolerance on email/phone/tax code gives false positives fast, so those stay exact-substring.
const normalize = (value: string) => value.toLowerCase()
const includesQuery = (value: string | null | undefined, query: string) =>
  !!value && normalize(value).includes(query)

// Plain substring matching under 3 characters: fuzzy-matching 1-2 chars matches nearly everything
// and would swamp quick single/double-letter checks. Normalizes fullName itself (idempotent) so the
// function is correct standalone
function nameMatches(fullName: string, query: string): boolean {
  const normalized = normalize(fullName)
  if (normalized.includes(query)) return true
  if (query.length < 3) return false

  // Multi-word queries (e.g. "john doe") fall through to the substring check above:
  // levenshtein.get() compares single tokens, so a per-word comparison against the whole query is a
  // large distance
  const tolerance = query.length <= 4 ? 1 : 2
  return normalized.split(/\s+/).some(word => levenshtein.get(word, query) <= tolerance)
}

// The Telegram nickname lives in another table, so the roster passes a live lookup by associate
// uuid.
export function createAssociatesGlobalFilterFn(
  getTelegramUsername?: (associateUuid: string) => string | null | undefined
) {
  return function associatesGlobalFilterFn(
    row: Row<Associate>, _columnId: string, filterValue: string
  ): boolean {
    const query = filterValue.trim().toLowerCase()
    if (!query) return true

    const {
      uuid, first_name, last_name, email_address, phone_number, tax_code
    } = row.original
    const fullName = `${first_name} ${last_name}`

    return nameMatches(fullName, query)
      || includesQuery(email_address, query)
      || includesQuery(phone_number, query)
      || includesQuery(tax_code, query)
      || includesQuery(getTelegramUsername?.(uuid), query)
  }
}

export const associatesGlobalFilterFn = createAssociatesGlobalFilterFn()
