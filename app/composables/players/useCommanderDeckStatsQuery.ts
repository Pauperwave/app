// app\composables\players\useCommanderDeckStatsQuery.ts
// Per-deck-instance stats for /players/[slug]/deck/[deckSlug].vue — unlike
// league's name-based deck_stats table, this app's tournament_round_results
// links to a specific commander_decks row via commander_deck_uuid, so a
// deck's stats stay correctly scoped to that exact instance regardless of
// who currently owns/borrows it (no separate "deck_stats" view needed).
// Same win/average definitions as commander_stats (migration
// 20260919040000): win = position 1, average = mean kill count per match.
export interface CommanderDeckStats {
  matchCount: number
  winCount: number
  totalKills: number
  averageScore: number
}

export function useCommanderDeckStatsQuery(deckUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['commander-deck-stats', toValue(deckUuid) ?? ''],
    enabled: () => !!toValue(deckUuid),
    query: async (): Promise<CommanderDeckStats> => {
      const uuid = toValue(deckUuid)
      if (!uuid) return { matchCount: 0, winCount: 0, totalKills: 0, averageScore: 0 }

      const { data: results, error: resultsError } = await supabase
        .from('tournament_round_results')
        .select('position, pairing_uuid, player_uuid')
        .eq('commander_deck_uuid', uuid)

      if (resultsError) throw resultsError
      if (!results || results.length === 0) {
        return { matchCount: 0, winCount: 0, totalKills: 0, averageScore: 0 }
      }

      const { data: kills, error: killsError } = await supabase
        .from('tournament_kills')
        .select('pairing_uuid, killer_uuid')
        .in('pairing_uuid', results.map(r => r.pairing_uuid))

      if (killsError) throw killsError

      const killCountByPairing = new Map<string, number>()
      for (const kill of kills ?? []) {
        const key = `${kill.pairing_uuid}|${kill.killer_uuid}`
        killCountByPairing.set(key, (killCountByPairing.get(key) ?? 0) + 1)
      }

      const matchCount = results.length
      const winCount = results.filter(r => r.position === 1).length
      const killCounts = results.map(r =>
        killCountByPairing.get(`${r.pairing_uuid}|${r.player_uuid}`) ?? 0
      )
      const totalKills = killCounts.reduce((sum, n) => sum + n, 0)
      const averageScore = matchCount > 0
        ? Math.round((totalKills / matchCount) * 100) / 100
        : 0

      return { matchCount, winCount, totalKills, averageScore }
    }
  })
}
