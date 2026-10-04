// app\composables\players\usePlayerStatsQuery.ts
// A player's Commander record for the "Statistiche" block on /players/[slug], from the player_stats
// view (migration 20261003150000), which already leaves test tournaments out. The special mentions
// have their own query (usePlayerMentionsQuery.ts).
export interface PlayerStats {
  tournamentsPlayed: number
  matchesPlayed: number
  wins: number
  averageKills: number
}

export function usePlayerStatsQuery(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['player-stats', toValue(playerUuid) ?? ''],
    enabled: () => !!toValue(playerUuid),
    query: async (): Promise<PlayerStats> => {
      const uuid = toValue(playerUuid)
      const { data, error } = await supabase
        .from('player_stats')
        .select('tournaments_played, matches_played, wins, average_kills')
        .eq('player_uuid', uuid ?? '')
        .maybeSingle()
      if (error) throw error

      return {
        tournamentsPlayed: data?.tournaments_played ?? 0,
        matchesPlayed: data?.matches_played ?? 0,
        wins: data?.wins ?? 0,
        averageKills: data?.average_kills ?? 0
      }
    }
  })
}
