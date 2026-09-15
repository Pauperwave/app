// app\composables\tournaments\useTournamentKillsQuery.ts
// Pinia Colada query for a Commander tournament's kill events, across every
// round — same "tournament-wide, filter client-side" convention as
// useTournamentPairingsQuery.ts.
export interface TournamentKill {
  uuid: string
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

export const TOURNAMENT_KILLS_KEY = (tournamentUuid: string) =>
  ['tournament-kills', tournamentUuid]

export function useTournamentKillsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_KILLS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentKill[]> => {
      const { data, error } = await supabase
        .from('tournament_kills')
        .select('uuid, pairing_uuid, killer_uuid, killed_player_uuid')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        pairingUuid: row.pairing_uuid,
        killerUuid: row.killer_uuid,
        killedPlayerUuid: row.killed_player_uuid
      }))
    }
  })
}
