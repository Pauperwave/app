// server\api\tournaments\[id]\status.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentStatusBody {
  status: string
}

// Dedicated partial-update endpoint (mirrors wanted-cards' own [id]/status.post.ts)
// for the bulk "mark as" action — update.post.ts requires the full
// NewTournamentPayload shape, which the bulk-actions bar doesn't have per row.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { status } = await readBody<SetTournamentStatusBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament status update failed'
    })
  }

  return { tournament }
})
