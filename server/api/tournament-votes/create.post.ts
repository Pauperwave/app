// server\api\tournament-votes\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateVoteBody {
  tournamentUuid: string
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}

// Single-select per category (one "best deck" + one "best play" vote per
// voter per pairing, matching league's own current VoteGrid/
// DeckPlayVotesModal — not the older "up to 2 play votes" behavior some
// docs described): replaces any existing vote of this type by this voter
// for this pairing before inserting the new one, since the DB's own unique
// constraint only blocks an exact duplicate, not a second different choice
// for the same category.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<CreateVoteBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error: deleteError } = await supabase
    .from('tournament_votes')
    .delete()
    .eq('pairing_uuid', body.pairingUuid)
    .eq('voter_uuid', body.voterUuid)
    .eq('vote_type', body.voteType)

  if (deleteError) {
    throw createError({ statusCode: 500, statusMessage: deleteError.message })
  }

  const { error } = await supabase.from('tournament_votes').insert({
    tournament_uuid: body.tournamentUuid,
    pairing_uuid: body.pairingUuid,
    voter_uuid: body.voterUuid,
    voted_player_uuid: body.votedPlayerUuid,
    vote_type: body.voteType
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
