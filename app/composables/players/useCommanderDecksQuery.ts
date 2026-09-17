// app\composables\players\useCommanderDecksQuery.ts
// "Mazzi Commander" card on /players/[slug] (user request, 2026-08-27) —
// commander_decks is public_read (RLS), no BFF needed for this read-only view.
export interface CommanderDeck {
  uuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
  companionName: string | null
  decklistUrl: string | null
  createdAt: string
  bracketLevel: BracketLevel | null
  isBorrowed: boolean
  lenderUuid: string | null
}

export function useCommanderDecksQuery(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['commander-decks', toValue(playerUuid) ?? ''],
    enabled: () => !!toValue(playerUuid),
    query: async (): Promise<CommanderDeck[]> => {
      const uuid = toValue(playerUuid)
      if (!uuid) return []

      const { data, error } = await supabase
        .from('commander_decks')
        .select(
          'uuid, player_uuid, commander_1_name, commander_2_name, companion_name, decklist_url, created_at, bracket_level, is_borrowed, lender_uuid'
        )
        .eq('player_uuid', uuid)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map(row => ({
        uuid: row.uuid,
        playerUuid: row.player_uuid,
        commander1Name: row.commander_1_name,
        commander2Name: row.commander_2_name,
        companionName: row.companion_name,
        decklistUrl: row.decklist_url,
        createdAt: row.created_at,
        bracketLevel: row.bracket_level as BracketLevel | null,
        isBorrowed: row.is_borrowed,
        lenderUuid: row.lender_uuid
      }))
    }
  })
}
