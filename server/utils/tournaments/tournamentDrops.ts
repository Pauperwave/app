// server\utils\tournaments\tournamentDrops.ts
// Records (or undoes) a player's drop — shared by the organizer's endpoint
// (server/api/tournament-drops/set.post.ts) and the Telegram bot's Commander
// self-service drop (commands/tournaments/commanderReport.ts). Each caller
// supplies its own authorization gate before calling. dropped_at is stamped
// by the database.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/utils/types/database'

export async function setPlayerDropped(supabase: SupabaseClient<Database>, input: {
  tournamentUuid: string
  playerUuid: string
  roundUuid: string
  dropped: boolean
}): Promise<void> {
  const { error } = input.dropped
    ? await supabase
      .from('tournament_player_drops')
      .upsert({
        tournament_uuid: input.tournamentUuid,
        player_uuid: input.playerUuid,
        round_uuid: input.roundUuid
      }, { onConflict: 'tournament_uuid,player_uuid', ignoreDuplicates: true })
    : await supabase
      .from('tournament_player_drops')
      .delete()
      .eq('tournament_uuid', input.tournamentUuid)
      .eq('player_uuid', input.playerUuid)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
