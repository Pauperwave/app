// app\composables\players\useCommanderMatchHistoryQuery.ts
// "Storico Partite" card on /players/[slug]: reads tournament_round_results directly (public_read
// RLS, no BFF for a read-only view), joined via real FKs to the
// tournament/round/pairing/commander-deck. Kills are a separate query (tournament_kills has no FK
// back to tournament_round_results, only the shared pairing_uuid) merged client-side by pairing
export interface CommanderMatchHistoryRow {
  id: number
  tournamentUuid: string
  tournamentName: string
  startsAt: string | null
  roundNumber: number | null
  tableNumber: number | null
  commanderName: string | null
  position: number | null
  kills: number
}

export function useCommanderMatchHistoryQuery(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['commander-match-history', toValue(playerUuid) ?? ''],
    enabled: () => !!toValue(playerUuid),
    query: async (): Promise<CommanderMatchHistoryRow[]> => {
      const uuid = toValue(playerUuid)
      if (!uuid) return []

      const [resultsResponse, killsResponse] = await Promise.all([
        supabase
          .from('tournament_round_results')
          .select(`
            id,
            position,
            pairing_uuid,
            tournament_uuid,
            tournaments!inner ( name, starts_at, is_test ),
            commander_decks ( commander_1_name, commander_2_name ),
            tournament_pairings ( table_number, tournament_rounds ( round_number ) )
          `)
          .eq('player_uuid', uuid)
          // Test tournaments never show up in a player's history
          .eq('tournaments.is_test', false),
        supabase
          .from('tournament_kills')
          .select('pairing_uuid, tournaments!inner(is_test)')
          .eq('killer_uuid', uuid)
          .eq('tournaments.is_test', false)
      ])

      if (resultsResponse.error) throw resultsResponse.error
      if (killsResponse.error) throw killsResponse.error

      const killsByPairing = new Map<string, number>()
      for (const kill of killsResponse.data ?? []) {
        killsByPairing.set(kill.pairing_uuid, (killsByPairing.get(kill.pairing_uuid) ?? 0) + 1)
      }

      return (resultsResponse.data ?? [])
        .map((row): CommanderMatchHistoryRow => {
          const commander = row.commander_decks
          const commanderName = commander
            ? [commander.commander_1_name, commander.commander_2_name].filter(Boolean).join(' / ')
            : null

          return {
            id: row.id,
            tournamentUuid: row.tournament_uuid,
            tournamentName: row.tournaments?.name ?? '',
            startsAt: row.tournaments?.starts_at ?? null,
            roundNumber: row.tournament_pairings?.tournament_rounds?.round_number ?? null,
            tableNumber: row.tournament_pairings?.table_number ?? null,
            commanderName,
            position: row.position,
            kills: killsByPairing.get(row.pairing_uuid) ?? 0
          }
        })
        .sort((a, b) => (b.startsAt ?? '').localeCompare(a.startsAt ?? ''))
    }
  })
}
