// server\api\tournament-rounds\reset.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ResetTournamentBody {
  tournamentUuid: string
}

// Wipes every round/pairing/result/standing for a tournament and resets it
// back to registration_open (migration 20260918020000) — format-agnostic,
// same RPC for Commander and 1v1 Swiss.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid } = await readBody<ResetTournamentBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('reset_tournament', {
    p_tournament_uuid: tournamentUuid
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
