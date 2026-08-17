// server\api\tournaments\[id]\entry-fee.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentEntryFeeBody {
  entryFee: number
}

// Dedicated partial-update endpoint (mirrors [id]/status.post.ts and
// [id]/image.post.ts) for the bulk "update price" action — update.post.ts
// requires the full NewTournamentPayload shape, which the bulk-actions bar
// doesn't have per row.
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
