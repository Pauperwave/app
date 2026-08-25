// app\composables\tournaments\useTournamentRegistrationsQuery.ts
// Pinia Colada query for a tournament's registrations (ADR-007 pattern, see
// useWantedCardsQuery.ts) — reads client -> Supabase directly, writes go
// through server/api/tournament-registrations/*.post.ts. Embeds `players`
// (not `players_full`) since PostgREST embed relies on the real FK
// (tournament_registrations.player_uuid -> players.uuid) — resolving the
// associate's name/email is left to whoever's already holding
// useAssociatesQuery.ts's cache (AcceptancePicker.vue), rather than
// duplicating that join here.
export interface TournamentRegistration {
  uuid: string
  status: 'registered' | 'checked_in' | 'no_show'
  createdAt: string
  checkedInAt: string | null
  playerUuid: string
  associateUuid: string
}

export const TOURNAMENT_REGISTRATIONS_KEY = (tournamentUuid: string) =>
  ['tournament-registrations', tournamentUuid]

export function useTournamentRegistrationsQuery(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => TOURNAMENT_REGISTRATIONS_KEY(toValue(tournamentUuid)),
    query: async (): Promise<TournamentRegistration[]> => {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select('uuid, status, created_at, checked_in_at, players(uuid, associate_uuid)')
        .eq('tournament_uuid', toValue(tournamentUuid))

      if (error) throw error

      return (data ?? [])
        .filter((row): row is typeof row & { players: { uuid: string, associate_uuid: string } } =>
          row.players !== null)
        .map(row => ({
          uuid: row.uuid,
          status: row.status as TournamentRegistration['status'],
          createdAt: row.created_at,
          checkedInAt: row.checked_in_at,
          playerUuid: row.players.uuid,
          associateUuid: row.players.associate_uuid
        }))
    }
  })
}
