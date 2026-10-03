// server\api\tournaments\[id]\entry-fee.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentEntryFeeBody {
  entryFee: number
}

// Partial update for the bulk "update price" action (mirrors [id]/status.post.ts): update.post.ts
// requires the full NewTournamentPayload, which the bulk bar doesn't have per row.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { entryFee } = await readBody<SetTournamentEntryFeeBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ entry_fee: entryFee })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament entry fee update failed'
    })
  }

  return { tournament }
})
