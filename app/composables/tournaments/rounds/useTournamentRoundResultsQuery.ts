// app\composables\tournaments\rounds\useTournamentRoundResultsQuery.ts
// Pinia Colada query for a Commander tournament's per-player round results
// (placement + chosen commander deck), across every round — same
// "tournament-wide, filter client-side" convention as
// useTournamentPairingsQuery.ts.
export interface TournamentRoundResult {
  pairingUuid: string
  playerUuid: string
  position: number | null
  commanderDeckUuid: string | null
}

export const TOURNAMENT_ROUND_RESULTS_KEY = (tournamentUuid: string) =>
  ['tournament-round-results', tournamentUuid]

export function useTournamentRoundResultsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_ROUND_RESULTS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentRoundResult[]> => {
      const { data, error } = await supabase
        .from('tournament_round_results')
        .select('pairing_uuid, player_uuid, position, commander_deck_uuid')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? []).map(row => ({
        pairingUuid: row.pairing_uuid,
        playerUuid: row.player_uuid,
        position: row.position,
        commanderDeckUuid: row.commander_deck_uuid
      }))
    }
  })
}
