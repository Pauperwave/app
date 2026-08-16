// server\api\leagues\[id]\status.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetLeagueStatusBody {
  status: string
}

// Dedicated partial-update endpoint (mirrors tournaments' own
// [id]/status.post.ts) for the bulk "mark as" action — update.post.ts
// requires the full NewLeaguePayload shape, which the bulk-actions bar
// doesn't have per row.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { status } = await readBody<SetLeagueStatusBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: league, error } = await supabase
    .from('leagues')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !league) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'League status update failed'
    })
  }

  return { league }
})
