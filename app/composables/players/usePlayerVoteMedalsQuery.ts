// app\composables\players\usePlayerVoteMedalsQuery.ts
// The decks a player earned brew ("master brewer") and play votes with, from the player_vote_decks
// view (migration 20261003180000), which already leaves test tournaments out
import { groupVoteMedals, type VoteMedals } from '#shared/utils/commanders/voteMedals'

export function usePlayerVoteMedalsQuery(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['player-vote-medals', toValue(playerUuid) ?? ''],
    enabled: () => !!toValue(playerUuid),
    query: async (): Promise<VoteMedals> => {
      const { data, error } = await supabase
        .from('player_vote_decks')
        .select('deck_uuid, commander_1_name, commander_2_name, vote_type, votes')
        .eq('player_uuid', toValue(playerUuid) ?? '')
      if (error) throw error

      return groupVoteMedals((data ?? []).flatMap(row => (row.deck_uuid && row.commander_1_name
        ? [{
          deckUuid: row.deck_uuid,
          commander1Name: row.commander_1_name,
          commander2Name: row.commander_2_name,
          voteType: row.vote_type ?? '',
          votes: Number(row.votes ?? 0)
        }]
        : [])))
    }
  })
}
