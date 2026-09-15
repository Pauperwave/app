// app\composables\tournaments\useTournamentStandingsQuery.ts
// Pinia Colada query for a Commander tournament's persisted standings
// (written by advance_commander_round, migration 20260916000000) — same
// "tournament-wide" convention as useTournamentPairingsQuery.ts. See
// useLiveCommanderStandings.ts for the reactive recompute shown while a
// round is still in progress (before the next advance-round persists here).
export interface TournamentStanding {
  uuid: string
  registrationUuid: string
  playerUuid: string
  score: number
  rank: number | null
  victories: number
  brewReceived: number
  playReceived: number
}

export const TOURNAMENT_STANDINGS_KEY = (tournamentUuid: string) =>
  ['tournament-standings', tournamentUuid]

export function useTournamentStandingsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_STANDINGS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentStanding[]> => {
      const { data, error } = await supabase
        .from('tournament_standings')
        .select('uuid, registration_uuid, player_uuid, player_score, player_rank, player_victories, votes_brew_received, votes_play_received')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        registrationUuid: row.registration_uuid,
        playerUuid: row.player_uuid,
        score: row.player_score ?? 0,
        rank: row.player_rank,
        victories: row.player_victories ?? 0,
        brewReceived: row.votes_brew_received ?? 0,
        playReceived: row.votes_play_received ?? 0
      }))
    }
  })
}
