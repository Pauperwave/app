// app\composables\commanders\useCommanderUsageQuery.ts
// Adapted from MagicTheGathering/league's useCommanderUsageQuery.ts (user
// request 2026-09-16: copy the commander/vote insertion logic bit-by-bit).
// league keys usage by numeric player_id and joins round_results ->
// pairings for the played date; this app's per-round result already has
// its own created_at (no separate pairings join needed) and keys everything
// by player_uuid (this app's persistent players.uuid) instead.
import type { Database } from '#shared/utils/types/database'

/** Per-commander play history for one player (ADR-027 in league): most
 *  recently played first, ties on the same calendar day broken by play count. */
export interface CommanderUsage {
  /** ISO `YYYY-MM-DD` (UTC) of the most recent round this commander was played in. */
  lastPlayedDay: string
  count: number
}

function recordUsage(usage: Map<string, CommanderUsage>, name: string | null, day: string) {
  if (!name) return
  const existing = usage.get(name)
  if (!existing) {
    usage.set(name, { lastPlayedDay: day, count: 1 })
    return
  }
  existing.count += 1
  if (day > existing.lastPlayedDay) existing.lastPlayedDay = day
}

async function fetchCommandersUsage(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  playerUuids: string[]
): Promise<Map<string, Map<string, CommanderUsage>>> {
  const byPlayer = new Map<string, Map<string, CommanderUsage>>()
  if (playerUuids.length === 0) return byPlayer

  const { data: results, error: resultsError } = await supabase
    .from('tournament_round_results')
    .select('player_uuid, commander_deck_uuid, created_at')
    .in('player_uuid', playerUuids)
    .not('commander_deck_uuid', 'is', null)

  if (resultsError || !results || results.length === 0) return byPlayer

  const deckUuids = [...new Set(
    results.map(r => r.commander_deck_uuid).filter((id): id is string => !!id)
  )]
  const { data: decks, error: decksError } = await supabase
    .from('commander_decks')
    .select('uuid, commander_1_name, commander_2_name')
    .in('uuid', deckUuids)

  if (decksError || !decks) return byPlayer

  const decksByUuid = new Map(decks.map(deck => [deck.uuid, deck]))

  for (const row of results) {
    const deck = row.commander_deck_uuid ? decksByUuid.get(row.commander_deck_uuid) : undefined
    if (!deck) continue
    const day = row.created_at.slice(0, 10)
    let usage = byPlayer.get(row.player_uuid)
    if (!usage) {
      usage = new Map()
      byPlayer.set(row.player_uuid, usage)
    }
    recordUsage(usage, deck.commander_1_name, day)
    recordUsage(usage, deck.commander_2_name, day)
  }
  return byPlayer
}

/**
 * Batch-fetches "which commanders has each of these players played before"
 * in a single request instead of one query per player — cache key is the
 * sorted player uuid list, so a caller asking for the same roster (e.g.
 * every seated player at a table) shares one cached result.
 */
export function useCommanderUsageQuery(playerUuids: MaybeRefOrGetter<string[]>) {
  const supabase = useSupabaseClient<Database>()

  const sortedUuids = computed(() => [...toValue(playerUuids)].sort())

  return useQuery({
    key: () => ['commander-usage', ...sortedUuids.value],
    query: () => fetchCommandersUsage(supabase, sortedUuids.value),
    enabled: () => sortedUuids.value.length > 0
  })
}
