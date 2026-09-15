// app\utils\fuzzyMatch.ts
// Ported from MagicTheGathering/league (user request, 2026-09-16) — the
// commander search box's autocomplete relevance ranking.

export interface FuzzyMatchResult {
  /** Higher is a better match — rewards contiguous and early matches. */
  score: number
  /** Index (into `text`) of each matched character, in query order. */
  indices: number[]
}

/**
 * Subsequence fuzzy match: every character of `query` must appear in `text`,
 * in order, but not necessarily contiguous (e.g. "arl" matches "Carlo").
 * Case-insensitive. Returns `null` when `query` doesn't match at all.
 *
 * O(text.length) per call, not O(text.length * query.length): `searchFrom`
 * only ever moves forward, so each `indexOf` scans a strictly later slice of
 * `text` than the previous one — across the whole loop, every character of
 * `text` is visited by at most one of those scans.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatchResult | null {
  const q = query.trim().toLowerCase()
  if (!q) return { score: 0, indices: [] }

  const t = text.toLowerCase()
  const indices: number[] = []
  let searchFrom = 0
  let previousIndex = -1
  let score = 0

  for (const char of q) {
    const foundAt = t.indexOf(char, searchFrom)
    if (foundAt === -1) return null

    score += foundAt === previousIndex + 1 ? 3 : 1
    indices.push(foundAt)
    previousIndex = foundAt
    searchFrom = foundAt + 1
  }

  return { score, indices }
}
