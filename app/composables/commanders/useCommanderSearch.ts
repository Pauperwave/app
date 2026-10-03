// app\composables\commanders\useCommanderSearch.ts
// Ported from league's useCommanderSearch.ts, swapping numeric playerId/tablePlayerIds for this
// app's uuid-keyed players.uuid
import { fetchCommanderByName, type CommanderCard } from './useCommanderCards'
import { useCommanderUsageQuery, type CommanderUsage } from './useCommanderUsageQuery'
import type { Database } from '#shared/utils/types/database'
import type { CommanderCatalogRow } from './useCommanderCatalogQuery'
import type { FuzzyMatchResult } from '~/utils/fuzzyMatch'

function parseManaCost(manaCost: string | null): string[] {
  if (!manaCost) return []
  return manaCost.match(/{[^}]+}/g) ?? []
}

/**
 * A selectable commander name, or a non-interactive group heading (`type: 'label'`) for
 * USelectMenu.
 */
export interface CommanderSuggestionItem {
  type?: 'label'
  label: string
  tokens?: string[]
  /**
   * Fuzzy-matched character indices (into `label`) to highlight, see `fuzzyMatch` in
   * `app/utils/fuzzyMatch.ts`.
   */
  matchIndices?: number[]
  /** Card image, shown in a hover-preview tooltip in CommanderSearch.vue. */
  imageUrl?: string | null
}

export interface UseCommanderSearchOptions {
  whitelist?: MaybeRefOrGetter<string[] | null | undefined>
  playerUuid?: MaybeRefOrGetter<string | null | undefined>
  /**
   * Every player seated at the same table/round as `playerUuid`: passed so the usage lookup batches
   * into one shared request  (see useCommanderUsageQuery) instead of one query per player each time
   * a commander modal opens.
   */
  tablePlayerUuids?: MaybeRefOrGetter<string[]>
}

/**
 * Commander autocomplete: filters the already-cached catalog client-side (no query per keystroke).
 * With `playerUuid`, results split into a "recently used" group (commanders the player already
 * played, per `tournament_round_results`) shown first and the rest, so USelectMenu renders them as
 * separate groups instead of one flat list. /
 */
export function useCommanderSearch(options: UseCommanderSearchOptions = {}) {
  const supabase = useSupabaseClient<Database>()
  const { data: catalog } = useCommanderCatalogQuery()
  const { t } = useI18n()

  // Batches this player's usage lookup with the rest of the table roster (see
  // useCommanderUsageQuery's cache sharing)
  const usageRosterUuids = computed(() => {
    const roster = toValue(options.tablePlayerUuids) ?? []
    const playerUuid = toValue(options.playerUuid)
    if (playerUuid && !roster.includes(playerUuid)) {
      return [...roster, playerUuid]
    }
    return roster
  })
  const { data: usageByPlayer, isLoading: usageLoading } = useCommanderUsageQuery(usageRosterUuids)

  const query = ref('')
  const suggestionGroups = ref<CommanderSuggestionItem[][]>([])
  const card = ref<CommanderCard | null>(null)
  const isComputing = ref(false)
  const isLoading = computed(() => isComputing.value || usageLoading.value)

  function computeSuggestions(q: string) {
    isComputing.value = true
    try {
      const trimmed = q.trim()
      const whitelist = toValue(options.whitelist)
      const whitelistSet = whitelist && whitelist.length > 0
        ? new Set(whitelist)
        : null

      // Fuzzy (subsequence) match, not substring: "arl" matches "Karlov". Indices are kept per name
      // so CommanderSearch.vue can highlight them
      const matches = new Map<string, FuzzyMatchResult>()
      const result = (catalog.value ?? []).filter((row) => {
        if (whitelistSet && !whitelistSet.has(row.name)) return false
        if (trimmed.length === 0) return true
        const match = fuzzyMatch(row.name, trimmed)
        if (!match) return false
        matches.set(row.name, match)
        return true
      })

      const playerUuid = toValue(options.playerUuid)
      const usage: Map<string, CommanderUsage> = (playerUuid
        ? usageByPlayer.value?.get(playerUuid)
        : undefined) ?? new Map()

      // Best fuzzy match first, edhrecRank (popularity) as the tiebreaker and the only sort with no
      // query (score is 0 for all)
      const byRelevance = (a: CommanderCatalogRow, b: CommanderCatalogRow) => {
        const scoreDiff = (matches.get(b.name)?.score ?? 0) - (matches.get(a.name)?.score ?? 0)
        return scoreDiff !== 0 ? scoreDiff : (a.edhrecRank ?? 999999) - (b.edhrecRank ?? 999999)
      }
      // "Già giocati" ignores relevance/popularity: most recently played day first, ties broken by
      // play count
      const byRecency = (a: CommanderCatalogRow, b: CommanderCatalogRow) => {
        const dayDiff = (usage.get(b.name)?.lastPlayedDay ?? '')
          .localeCompare(usage.get(a.name)?.lastPlayedDay ?? '')
        return dayDiff !== 0
          ? dayDiff
          : (usage.get(b.name)?.count ?? 0) - (usage.get(a.name)?.count ?? 0)
      }
      const toItem = (row: CommanderCatalogRow): CommanderSuggestionItem => ({
        label: row.name,
        tokens: parseManaCost(row.manaCost),
        matchIndices: matches.get(row.name)?.indices,
        imageUrl: row.imageUrl
      })

      // Split BEFORE capping to 50: a niche commander the player has played must not be cut by the
      // popularity cap before its "used" status is checked
      const used = result.filter(row => usage.has(row.name)).sort(byRecency).map(toItem)
      const rest = result
        .filter(row => !usage.has(row.name))
        .sort(byRelevance)
        .slice(0, 50)
        .map(toItem)

      const groups: CommanderSuggestionItem[][] = []
      if (used.length > 0) {
        groups.push([{ type: 'label', label: t('tournament.single.commanderModal.search.recentlyUsedGroup') }, ...used])
      }
      if (rest.length > 0) {
        groups.push([{ type: 'label', label: t('tournament.single.commanderModal.search.allCommandersGroup') }, ...rest])
      }
      suggestionGroups.value = groups
    } finally {
      isComputing.value = false
    }
  }

  async function handleSelect(name: string) {
    const data = await fetchCommanderByName(supabase, name)
    card.value = data
  }

  const debouncedCompute = useDebounceFn((q: string) => {
    computeSuggestions(q)
  }, 150)

  // Recomputes on every dependency that can change the result set: the query text, the whitelist
  // (e.g. commander1's partner type narrowing commander2's options), the catalog and the usage
  // lookup (on a cold cache the modal can open before they resolve, so the first pass would filter
  // an empty one). Immediate, so a short whitelist is browsable before typing
  watch([query, () => toValue(options.whitelist), catalog, usageByPlayer], ([newQuery]) => {
    debouncedCompute(newQuery)
  }, { immediate: true })

  return {
    query,
    suggestionGroups,
    isLoading,
    handleSelect,
    card
  }
}
