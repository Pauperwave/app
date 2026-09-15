// server\api\tournament-round-results\upsert.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpsertRoundResultsBody {
  tournamentUuid: string
  results: { pairingUuid: string, playerUuid: string, position: number }[]
}

// One upsert call for a whole pod's placements at once — TableScoreGridModal.vue's
// "Confirm" submits every seat's rank together, same atomic-per-pod write as
// league's own upsertRoundResult (ON CONFLICT (pairing_uuid, player_uuid) DO UPDATE).
//
// Deliberately simpler completion rule than league's own isTableComplete
// (which also requires every seat's commander + vote to be set before a
// pairing counts as "complete"): here, a pairing is marked completed as
// soon as its ranking is submitted. Requiring kills/votes/commander too
// would block advancing a round on organizers remembering to fill in every
// optional field for every pod at a live event — the ranking is the only
// input the scoring math actually needs. Safe to do unconditionally here
// because TableScoreGridModal only ever submits once every seat has a
// placement (isValidFormation requires all seats filled).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, results } = await readBody<UpsertRoundResultsBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error: resultsError } = await supabase
    .from('tournament_round_results')
    .upsert(
      results.map(r => ({
        tournament_uuid: tournamentUuid,
        pairing_uuid: r.pairingUuid,
        player_uuid: r.playerUuid,
        position: r.position
      })),
      { onConflict: 'pairing_uuid,player_uuid' }
    )

  if (resultsError) {
    throw createError({ statusCode: 500, statusMessage: resultsError.message })
  }

  const pairingUuid = results[0]?.pairingUuid
  if (pairingUuid) {
    const { error: statusError } = await supabase
      .from('tournament_pairings')
      .update({ status: 'completed' })
      .eq('uuid', pairingUuid)

    if (statusError) {
      throw createError({ statusCode: 500, statusMessage: statusError.message })
    }
  }

  return { success: true }
})
