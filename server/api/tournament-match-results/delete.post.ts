// server\api\tournament-match-results\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteMatchResultBody {
  pairingUuid: string
}

// Removes one table's result and puts the pairing back to pending.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { pairingUuid } = await readBody<DeleteMatchResultBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error: resultError } = await supabase
    .from('tournament_match_results')
    .delete()
    .eq('pairing_uuid', pairingUuid)

  if (resultError) {
    throw createError({ statusCode: 500, statusMessage: resultError.message })
  }

  const { error: statusError } = await supabase
    .from('tournament_pairings')
    .update({ status: 'pending' })
    .eq('uuid', pairingUuid)

  if (statusError) {
    throw createError({ statusCode: 500, statusMessage: statusError.message })
  }

  return { success: true }
})
