// app\composables\commanders\useCommanderUsageQuery.ts
// Adapted from league's useCommanderUsageQuery.ts: league keys usage by numeric player_id and joins
// round_results -> pairings for the played date, while this app's round result has its own
// created_at (no pairings join) and keys by player_uuid (players.uuid). The counting lives in
// shared/utils/commanders/commanderUsage.ts (also used by the Telegram bot's history)
import {
  buildCommanderUsageByPlayer, type CommanderUsage
} from '#shared/utils/commanders/commanderUsage'
import type { Database } from '#shared/utils/types/database'

export type { CommanderUsage }

async function fetchCommandersUsage(
  supabase: ReturnType<typeof useSupabaseClient<Database>>,
  playerUuids: string[]
): Promise<Map<string, Map<string, CommanderUsage>>> {
  if (playerUuids.length === 0) return new Map()

  const { data: results, error: resultsError } = await supabase
    .from('tournament_round_results')
    .select('player_uuid, commander_deck_uuid, created_at, tournaments!inner(is_test)')
    .in('player_uuid', playerUuids)
    .not('commander_deck_uuid', 'is', null)
    // Test tournaments never count as a commander played
    .eq('tournaments.is_test', false)

  if (resultsError || !results || results.length === 0) return new Map()

  const deckUuids = [...new Set(
    results.map(r => r.commander_deck_uuid).filter((id): id is string => !!id)
  )]
  const { data: decks, error: decksError } = await supabase
    .from('commander_decks')
    .select('uuid, commander_1_name, commander_2_name')
    .in('uuid', deckUuids)

  if (decksError || !decks) return new Map()

  return buildCommanderUsageByPlayer(
    results.map(row => ({
      playerUuid: row.player_uuid,
      commanderDeckUuid: row.commander_deck_uuid,
      createdAt: row.created_at
    })),
    decks.map(deck => ({
      uuid: deck.uuid,
      commander1Name: deck.commander_1_name,
      commander2Name: deck.commander_2_name
    }))
  )
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
