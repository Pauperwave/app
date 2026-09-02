// app\composables\tournaments\useMyTournamentRegistrationsQuery.ts
// Every tournament_registrations row for the logged-in user's own player —
// one query for the whole /calendario|/calendar timeline instead of one per
// card (useTournamentRegistrationsQuery.ts is per-tournament, meant for the
// staff management page where only one tournament is open at a time). Reads
// directly via client Supabase (public_read RLS policy on
// tournament_registrations), no BFF needed for this read.
export interface MyTournamentRegistration {
  tournamentUuid: string
  status: 'registered' | 'checked_in' | 'no_show'
}

export const MY_TOURNAMENT_REGISTRATIONS_KEY = ['my-tournament-registrations']

export function useMyTournamentRegistrationsQuery() {
  const supabase = useSupabaseClient()
  const authUser = useSupabaseUser()

  return useQuery({
    key: MY_TOURNAMENT_REGISTRATIONS_KEY,
    enabled: () => !!authUser.value,
    query: async (): Promise<MyTournamentRegistration[]> => {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('tournament_uuid, status, players!inner(user_id)')
        .eq('players.user_id', authUser.value?.id ?? '')

      if (error) throw error

      return data.map(row => ({
        tournamentUuid: row.tournament_uuid,
        status: row.status as MyTournamentRegistration['status']
      }))
    }
  })
}
