// app\composables\commanders\useCommanderSearch.ts
// Commander autocomplete: filters the already-cached catalog client-side,
// no query per keystroke. Ported from MagicTheGathering/league's
// useCommanderSearch.ts (user request, 2026-09-16), with the
// "recently used by this player" grouping/reordering dropped — that needs
// a round_results usage query (useCommanderUsageQuery in league), out of
// scope for this port (see the fork directive: usage-history/analytics
// composables are explicitly excluded).
import type { CommanderCatalogRow } from './useCommanderCatalogQuery'

export interface CommanderSuggestionItem {
  label: string
  imageUrl?: string | null
}

export interface UseCommanderSearchOptions {
  whitelist?: MaybeRefOrGetter<string[] | null | undefined>
}

export function useCommanderSearch(options: UseCommanderSearchOptions = {}) {
  const { data: catalog } = useCommanderCatalogQuery()

  const query = ref('')
  const suggestions = ref<CommanderSuggestionItem[]>([])
  const isComputing = ref(false)

  function computeSuggestions(q: string) {
    isComputing.value = true
    try {
      const trimmed = q.trim()
      const whitelist = toValue(options.whitelist)
      const whitelistSet = whitelist && whitelist.length > 0 ? new Set(whitelist) : null

      const matches = new Map<string, number>()
      const result = (catalog.value ?? []).filter((row) => {
        if (whitelistSet && !whitelistSet.has(row.name)) return false
        if (trimmed.length === 0) return true
        const match = fuzzyMatch(row.name, trimmed)
        if (!match) return false
        matches.set(row.name, match.score)
        return true
      })

      // Best fuzzy match first, edhrecRank (popularity) as the tiebreaker —
      // and the only sort when there's no query (score is 0 for everyone).
      const byRelevance = (a: CommanderCatalogRow, b: CommanderCatalogRow) => {
        const scoreDiff = (matches.get(b.name) ?? 0) - (matches.get(a.name) ?? 0)
        return scoreDiff !== 0 ? scoreDiff : (a.edhrecRank ?? 999999) - (b.edhrecRank ?? 999999)
      }

      suggestions.value = result
        .sort(byRelevance)
        .slice(0, 50)
        .map(row => ({ label: row.name, imageUrl: row.artCropUrl ?? row.imageUrl }))
    } finally {
      isComputing.value = false
    }
  }

  const debouncedCompute = useDebounceFn((q: string) => computeSuggestions(q), 150)

  // Recomputes on every dependency that can change the result set: query
  // text, the whitelist (e.g. commander1's partner type flips, narrowing
  // commander2's options), and the catalog itself (a cold cache can still
  // be loading when the modal opens, so the first pass would otherwise
  // filter an empty catalog). Fires immediately so a short whitelist is
  // already browsable before typing anything.
  watch([query, () => toValue(options.whitelist), catalog], ([newQuery]) => {
    debouncedCompute(newQuery)
  }, { immediate: true })

  return { query, suggestions, isLoading: isComputing }
}
