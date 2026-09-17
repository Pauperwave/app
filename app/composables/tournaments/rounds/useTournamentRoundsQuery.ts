// app\composables\tournaments\rounds\useTournamentRoundsQuery.ts
// Pinia Colada query for a Commander tournament's rounds (ADR-007 pattern,
// see useTournamentRegistrationsQuery.ts) — reads client -> Supabase
// directly, writes go through server/api/tournament-rounds/*.post.ts.
export interface TournamentRound {
  uuid: string
  roundNumber: number
  status: 'scheduled' | 'preview' | 'approved' | 'in_progress' | 'completed'
  startedAt: string | null
  endedAt: string | null
}

export const TOURNAMENT_ROUNDS_KEY = (tournamentUuid: string) =>
  ['tournament-rounds', tournamentUuid]

export function useTournamentRoundsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_ROUNDS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentRound[]> => {
      const { data, error } = await supabase
        .from('tournament_rounds')
        .select('uuid, round_number, status, started_at, ended_at')
        .eq('tournament_uuid', toValue(tournamentUuid))
        .order('round_number', { ascending: true })

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        roundNumber: row.round_number,
        status: row.status as TournamentRound['status'],
        startedAt: row.started_at,
        endedAt: row.ended_at
      }))
    }
  })
}
