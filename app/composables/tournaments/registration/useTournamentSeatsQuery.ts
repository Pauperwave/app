// app\composables\tournaments\registration\useTournamentSeatsQuery.ts
// How many places each tournament with a player cap has taken, for the "Posti esauriti" shown on
// the calendar. One shared read (not one per card): the capped tournaments first, then only their
// registrations. Both tables are public_read, so it works for the anonymous /calendario too.
import {
  countTakenSeats, isTournamentFull
} from '#shared/utils/tournaments/capacity'

export const TOURNAMENT_SEATS_KEY = ['tournament-seats']

interface TournamentSeats {
  max: number
  taken: number
}

export function useTournamentSeatsQuery() {
  const supabase = useSupabaseClient()

  const query = useQuery({
    key: TOURNAMENT_SEATS_KEY,
    query: async (): Promise<Record<string, TournamentSeats>> => {
      const { data: capped, error } = await supabase
        .from('tournaments')
        .select('uuid, max_entrants')
        .not('max_entrants', 'is', null)
        .is('deleted_at', null)
      if (error) throw error
      if (!capped?.length) return {}

      const uuids = capped.map(tournament => tournament.uuid)
      const registrations = await fetchAllRows(async (from, to) => supabase
        .from('tournament_registrations')
        .select('tournament_uuid, status')
        .in('tournament_uuid', uuids)
        .order('id')
        .range(from, to))
      const taken = countTakenSeats(registrations)

      return Object.fromEntries(capped.map(tournament => [
        tournament.uuid,
        { max: tournament.max_entrants ?? 0, taken: taken.get(tournament.uuid) ?? 0 }
      ]))
    }
  })

  function isFull(tournamentUuid: string): boolean {
    const seats = query.data.value?.[tournamentUuid]
    return !!seats && isTournamentFull(seats.max, seats.taken)
  }

  return { ...query, isFull }
}
