// server\api\tournaments\[id]\image.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentImageBody {
  imageUrl: string | null
}

// Dedicated partial-update endpoint (mirrors [id]/status.post.ts) for the
// bulk "set image" action — update.post.ts requires the full
// NewTournamentPayload shape, which the bulk-actions bar doesn't have per row.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { imageUrl } = await readBody<SetTournamentImageBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ image_url: imageUrl })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament image update failed'
    })
  }

  return { tournament }
})
