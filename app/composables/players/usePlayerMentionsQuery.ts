// app\composables\players\usePlayerMentionsQuery.ts
// A player's special mentions for the "Menzioni speciali" block on /players/[slug]: the tournaments
// where they came first in each end-of-tournament award, from tournament_award_winners (migration
// 20261004220000). It already leaves out tournaments that aren't completed and test ones; the rows
// of one player are few, so they are read whole and summed here.
import { summarizeMentions, type PlayerMentions } from '#shared/utils/players/playerMentions'

export function usePlayerMentionsQuery(playerUuid: MaybeRefOrGetter<string | undefined>) {
  const supabase = useSupabaseClient()

  return useQuery({
    key: () => ['player-mentions', toValue(playerUuid) ?? ''],
    enabled: () => !!toValue(playerUuid),
    query: async (): Promise<PlayerMentions> => {
      const { data, error } = await supabase
        .from('tournament_award_winners')
        .select('award, deck_uuid, commander_1_name, commander_2_name')
        .eq('player_uuid', toValue(playerUuid) ?? '')
      if (error) throw error

      return summarizeMentions(data ?? [])
    }
  })
}
