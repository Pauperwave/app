// server\api\tournament-round-results\upsert.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpsertRoundResultsBody {
  tournamentUuid: string
  results: { pairingUuid: string, playerUuid: string, position: number }[]
}

// One upsert for a whole pod's placements (TableScoreGridModal.vue "Confirm" submits every seat's
// rank together), ON CONFLICT (pairing_uuid, player_uuid) DO UPDATE.
//
// Simpler completion rule than league's isTableComplete: a pairing is completed as soon as its
// ranking is submitted, since kills/votes/commander are optional and would block advancing a live
// round. Safe because the modal only submits once every seat has a placement (isValidFormation).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid, results } = await readBody<UpsertRoundResultsBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  for (const pairingUuid of new Set(results.map(result => result.pairingUuid))) {
    await assertPairingEditable(supabase, pairingUuid)
  }

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
