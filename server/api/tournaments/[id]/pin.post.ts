// server\api\tournaments\[id]\pin.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentPinnedBody {
  isPinned: boolean
}

// Dedicated partial-update endpoint, same shape as [id]/entry-fee.post.ts.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { isPinned } = await readBody<SetTournamentPinnedBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ is_pinned: isPinned })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament pin update failed'
    })
  }

  return { tournament }
})
