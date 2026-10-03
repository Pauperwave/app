// app\composables\commanders\useDecksFeaturingCommanderQuery.ts
// Every deck (any player) that has featured a given commander in either slot: backs
// /statistics/commanders/[slug].vue's "Giocatori che lo hanno usato" list (league's commander
// detail page, adapted)
export interface DeckFeaturingCommander {
  uuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
}

export function useDecksFeaturingCommanderQuery(name: MaybeRefOrGetter<string | null | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['decks-featuring-commander', toValue(name) ?? ''],
    enabled: () => !!toValue(name),
    query: async (): Promise<DeckFeaturingCommander[]> => {
      const commanderName = toValue(name)
      if (!commanderName) return []

      // Two .eq() queries, not one .or() with the name interpolated into PostgREST's raw filter
      // syntax: a name with a comma ("Kess, Dissident Mage") would break the filter string
      const [asFirst, asSecond] = await Promise.all([
        supabase.from('commander_decks')
          .select('uuid, player_uuid, commander_1_name, commander_2_name')
          .eq('commander_1_name', commanderName),
        supabase.from('commander_decks')
          .select('uuid, player_uuid, commander_1_name, commander_2_name')
          .eq('commander_2_name', commanderName)
      ])

      if (asFirst.error) throw asFirst.error
      if (asSecond.error) throw asSecond.error

      return [...(asFirst.data ?? []), ...(asSecond.data ?? [])].map(row => ({
        uuid: row.uuid,
        playerUuid: row.player_uuid,
        commander1Name: row.commander_1_name,
        commander2Name: row.commander_2_name
      }))
    }
  })
}
