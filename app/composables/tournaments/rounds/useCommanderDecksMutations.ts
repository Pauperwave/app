// app\composables\tournaments\rounds\useCommanderDecksMutations.ts
// Get-or-create a commander_decks row (unique per player + commander/
// partner combo, enforced by uq_commander_decks_single/uq_commander_decks_partner)
// then point a round result's commander_deck_uuid at it — CommanderSelectModal.vue's
// "Confirm" does both in one call. Reads go through the existing
// composables/players/useCommanderDecksQuery.ts (same table, already built
// for /players/[slug]'s own "Mazzi Commander" card) rather than a second
// query composable for the same data — its query key (['commander-decks',
// playerUuid]) is what gets invalidated below.
export function useCommanderDecksMutations(tournamentUuid: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()

  const selectCommander = useMutation({
    mutation: (payload: {
      pairingUuid: string
      playerUuid: string
      commander1Name: string
      commander2Name: string | null
    }) => $fetch('/api/commander-decks/select', { method: 'POST', body: payload }),
    onSettled: (_data, _error, payload) => {
      if (payload) {
        queryCache.invalidateQueries({ key: ['commander-decks', payload.playerUuid] })
      }
      queryCache.invalidateQueries({ key: TOURNAMENT_ROUND_RESULTS_KEY(toValue(tournamentUuid)) })
    }
  })

  return { selectCommander }
}
