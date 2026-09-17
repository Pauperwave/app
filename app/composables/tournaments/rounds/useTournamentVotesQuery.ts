// app\composables\tournaments\rounds\useTournamentVotesQuery.ts
// Pinia Colada query for a Commander tournament's brew/play votes, across
// every round — same "tournament-wide, filter client-side" convention as
// useTournamentPairingsQuery.ts.
export interface TournamentVote {
  uuid: string
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}

export const TOURNAMENT_VOTES_KEY = (tournamentUuid: string) =>
  ['tournament-votes', tournamentUuid]

export function useTournamentVotesQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_VOTES_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentVote[]> => {
      const { data, error } = await supabase
        .from('tournament_votes')
        .select('uuid, pairing_uuid, voter_uuid, voted_player_uuid, vote_type')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        pairingUuid: row.pairing_uuid,
        voterUuid: row.voter_uuid,
        votedPlayerUuid: row.voted_player_uuid,
        voteType: row.vote_type as TournamentVote['voteType']
      }))
    }
  })
}
