// app\composables\tournaments\registration\useTournamentRegistrationsRealtime.ts
// Live-updates a tournament's registrations: someone registering (or unregistering) through the
// Telegram bot shows up in "Pre-registrati"/"Iscritti" without a refresh. tournament_registrations
// is already in the supabase_realtime publication; same "invalidate, don't merge payloads" approach
// as useTournamentMatchResultsRealtime.ts
export function useTournamentRegistrationsRealtime(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  useTournamentRealtimeChannel(
    tournamentUuid,
    uuid => `tournament-registrations-${uuid}`,
    (channel, uuid) => {
      const refresh = () => queryCache.invalidateQueries({
        key: TOURNAMENT_REGISTRATIONS_KEY(uuid)
      })

      return channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT', schema: 'public', table: 'tournament_registrations',
            filter: `tournament_uuid=eq.${uuid}`
          },
          refresh
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', schema: 'public', table: 'tournament_registrations',
            filter: `tournament_uuid=eq.${uuid}`
          },
          refresh
        )
        // Supabase can't filter DELETE events (an unregistration), so any delete refreshes this one.
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'tournament_registrations' },
          refresh
        )
    },
    { clientOnly: true }
  )
}
