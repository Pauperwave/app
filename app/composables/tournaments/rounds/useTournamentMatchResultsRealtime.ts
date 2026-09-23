// app\composables\tournaments\rounds\useTournamentMatchResultsRealtime.ts
// Live-updates SwissRoundManager.vue's own match-results/reports/pairings
// queries whenever the Telegram bot writes a report or a result (2026-09-23
// user request: an organizer/admin watching a round should see a player's
// submitted result — and whether the opponent confirmed it — without a
// manual page refresh). Supabase Realtime's postgres_changes, filtered by
// tournament_uuid, invalidates the relevant Pinia Colada caches on any
// insert/update/delete rather than merging payloads into query state
// directly — the existing queries already fetch the tournament's whole
// (small) result/report set, so a refetch is simple and keeps one source of
// truth for the shape of that data.
export function useTournamentMatchResultsRealtime(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  let channel: ReturnType<typeof supabase.channel> | null = null

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
    channel = null
  }

  function subscribe(uuid: string) {
    channel = supabase
      .channel(`tournament-match-results-${uuid}`)
      .on(
        'postgres_changes',
        {
          event: '*', schema: 'public', table: 'tournament_match_results',
          filter: `tournament_uuid=eq.${uuid}`
        },
        () => {
          queryCache.invalidateQueries({ key: TOURNAMENT_MATCH_RESULTS_KEY(uuid) })
          queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(uuid) })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', schema: 'public', table: 'tournament_match_result_reports',
          filter: `tournament_uuid=eq.${uuid}`
        },
        () => queryCache.invalidateQueries({ key: TOURNAMENT_MATCH_REPORTS_KEY(uuid) })
      )
      .subscribe()
  }

  watch(() => toValue(tournamentUuid), (uuid) => {
    unsubscribe()
    if (uuid) subscribe(uuid)
  }, { immediate: true })

  onUnmounted(unsubscribe)
}
