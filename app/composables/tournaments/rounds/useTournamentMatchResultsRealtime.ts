// app\composables\tournaments\rounds\useTournamentMatchResultsRealtime.ts
// Live-updates SwissRoundManager.vue's match-results/pairings queries when the Telegram bot writes
// a result or the opponent confirms/disputes it, so an organizer sees it without refreshing.
// Supabase Realtime postgres_changes, filtered by tournament_uuid, invalidates the Pinia Colada
// caches on any change rather than merging payloads: the query already fetches the tournament's
// whole (small) result set, so a refetch keeps one source of truth for its shape
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
      .subscribe()
  }

  watch(() => toValue(tournamentUuid), (uuid) => {
    unsubscribe()
    if (uuid) subscribe(uuid)
  }, { immediate: true })

  onUnmounted(unsubscribe)
}
