// app\composables\tournaments\useCommanderDecksByUuidsQuery.ts
// Batch commander-deck-name lookup by uuid — lets CommanderRoundManager.vue
// resolve "which commander is player X currently playing this round" (for
// TournamentVotesModal's CommanderVoteCard art) from the deck uuids already
// on tournament_round_results, without a per-player round-trip.
export interface CommanderDeckNames {
  commander1Name: string
  commander2Name: string | null
}

export function useCommanderDecksByUuidsQuery(deckUuids: MaybeRefOrGetter<string[]>) {
  const supabase = useSupabaseClient()

  const sortedUuids = computed(() => [...toValue(deckUuids)].sort())

  return useQuery({
    key: () => ['commander-decks-by-uuids', ...sortedUuids.value],
    enabled: () => sortedUuids.value.length > 0,
    query: async (): Promise<Map<string, CommanderDeckNames>> => {
      const { data, error } = await supabase
        .from('commander_decks')
        .select('uuid, commander_1_name, commander_2_name')
        .in('uuid', sortedUuids.value)

      if (error) throw error

      return new Map((data ?? []).map(row => [
        row.uuid,
        { commander1Name: row.commander_1_name, commander2Name: row.commander_2_name }
      ]))
    }
  })
}
