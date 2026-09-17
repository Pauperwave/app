// app\composables\tournaments\pairing\useTournamentPairingsQuery.ts
// Pinia Colada query for a Commander tournament's pairings (pods), across
// every round — the round view filters by roundUuid client-side rather than
// re-querying per round, same "fetch the tournament's whole small dataset
// once" convention as useTournamentRegistrationsQuery.ts. Player uuids here
// are `players.uuid` (playerUuid), NOT the associate uuid used elsewhere in
// the UI — resolve via useTournamentRegistrationsQuery's own playerUuid/
// associateUuid mapping when building display seats (see
// useCommanderPairingTables.ts).
export interface TournamentPairing {
  uuid: string
  roundUuid: string
  tableNumber: number | null
  playerUuids: string[]
  status: 'pending' | 'playing' | 'completed'
}

export const TOURNAMENT_PAIRINGS_KEY = (tournamentUuid: string) =>
  ['tournament-pairings', tournamentUuid]

export function useTournamentPairingsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_PAIRINGS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentPairing[]> => {
      const { data, error } = await supabase
        .from('tournament_pairings')
        .select('uuid, round_uuid, table_number, status, player1_uuid, player2_uuid, player3_uuid, player4_uuid')
        .eq('tournament_uuid', toValue(tournamentUuid))
        .order('table_number', { ascending: true })

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        roundUuid: row.round_uuid,
        tableNumber: row.table_number,
        status: row.status as TournamentPairing['status'],
        playerUuids: [row.player1_uuid, row.player2_uuid, row.player3_uuid, row.player4_uuid]
          .filter((uuid): uuid is string => uuid !== null)
      }))
    }
  })
}
