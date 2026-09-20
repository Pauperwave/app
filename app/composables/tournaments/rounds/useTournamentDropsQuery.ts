// app\composables\tournaments\rounds\useTournamentDropsQuery.ts
// Pinia Colada query for a 1v1 tournament's dropped players: who dropped, in
// which round and when. Tournament-wide, filtered client-side, same convention
// as useTournamentMatchResultsQuery.ts.
export interface TournamentDrop {
  playerUuid: string
  roundUuid: string
  droppedAt: string
}

export const TOURNAMENT_DROPS_KEY = (tournamentUuid: string) =>
  ['tournament-drops', tournamentUuid]

export function useTournamentDropsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_DROPS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentDrop[]> => {
      const data = await fetchAllRows((from, to) => supabase
        .from('tournament_player_drops')
        .select('player_uuid, round_uuid, dropped_at')
        .eq('tournament_uuid', toValue(tournamentUuid))
        .order('id')
        .range(from, to))

      return data.map(row => ({
        playerUuid: row.player_uuid,
        roundUuid: row.round_uuid,
        droppedAt: row.dropped_at
      }))
    }
  })
}
