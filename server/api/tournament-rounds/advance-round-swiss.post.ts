// server\api\tournament-rounds\advance-round-swiss.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface AdvanceRoundSwissBody {
  tournamentUuid: string
  currentRoundNumber: number
  // Required unless this is the last round — see advance-round.post.ts
  // (Commander)'s own comment. No standings-driven bracket pairing yet
  // (phase 3 of the plan), so this is whatever order the organizer
  // arranged in SwissTablePreviewModal.vue.
  associateOrder?: string[]
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const {
    tournamentUuid,
    currentRoundNumber,
    associateOrder
  } = await readBody<AdvanceRoundSwissBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase.rpc('advance_swiss_round', {
    p_tournament_uuid: tournamentUuid,
    p_current_round_number: currentRoundNumber,
    p_associate_order: associateOrder
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { roundUuid: data, hasEnded: data === null }
})
