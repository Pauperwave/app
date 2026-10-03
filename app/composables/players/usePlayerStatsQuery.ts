// app\composables\players\usePlayerStatsQuery.ts
// A player's Commander record for the "Statistiche" block on /players/[slug], from the player_stats
// view (migration 20261003150000), which already leaves test tournaments out
export interface PlayerStats {
  tournamentsPlayed: number
  matchesPlayed: number
  wins: number
  kills: number
  timesKilled: number
  brewVotesReceived: number
  playVotesReceived: number
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
        .select('*')
        .eq('player_uuid', uuid ?? '')
        .maybeSingle()
      if (error) throw error

      return {
        tournamentsPlayed: data?.tournaments_played ?? 0,
        matchesPlayed: data?.matches_played ?? 0,
        wins: data?.wins ?? 0,
        kills: data?.kills ?? 0,
        timesKilled: data?.times_killed ?? 0,
        brewVotesReceived: data?.brew_votes_received ?? 0,
        playVotesReceived: data?.play_votes_received ?? 0,
        averageKills: data?.average_kills ?? 0
      }
    }
  })
}
