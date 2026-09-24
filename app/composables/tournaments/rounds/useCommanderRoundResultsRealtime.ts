// app\composables\tournaments\rounds\useCommanderRoundResultsRealtime.ts
// Live-updates CommanderRoundManager.vue's own results/kills/votes/pairings
// queries whenever the Telegram bot writes to a pod (2026-09-24 bug report:
// picking a commander via the bot didn't show up in the app without a
// manual refresh — unlike the 1v1 flow's own useTournamentMatchResultsRealtime.ts,
// no equivalent subscription existed for Commander at all). Invalidating
// TOURNAMENT_ROUND_RESULTS_KEY also cascades into
// useCommanderDecksByUuidsQuery's own commander-name lookup, since that
// query's key is derived reactively from the round results' own
// commanderDeckUuid values — no separate commander_decks subscription needed.
export function useCommanderRoundResultsRealtime(tournamentUuid: MaybeRefOrGetter<string>) {
  const supabase = useSupabaseClient()
  const queryCache = useQueryCache()

  let channel: ReturnType<typeof supabase.channel> | null = null

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
    channel = null
  }

  function subscribe(uuid: string) {
    channel = supabase
      .channel(`commander-round-results-${uuid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_round_results', filter: `tournament_uuid=eq.${uuid}` },
        () => {
          queryCache.invalidateQueries({ key: TOURNAMENT_ROUND_RESULTS_KEY(uuid) })
          queryCache.invalidateQueries({ key: TOURNAMENT_PAIRINGS_KEY(uuid) })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_kills', filter: `tournament_uuid=eq.${uuid}` },
        () => queryCache.invalidateQueries({ key: TOURNAMENT_KILLS_KEY(uuid) })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_votes', filter: `tournament_uuid=eq.${uuid}` },
        () => queryCache.invalidateQueries({ key: TOURNAMENT_VOTES_KEY(uuid) })
      )
      .subscribe()
  }

  watch(() => toValue(tournamentUuid), (uuid) => {
    unsubscribe()
    if (uuid) subscribe(uuid)
  }, { immediate: true })

  onUnmounted(unsubscribe)
}
