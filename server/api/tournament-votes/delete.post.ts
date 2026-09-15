// server\api\tournament-votes\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteVoteBody {
  voteUuid: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { voteUuid } = await readBody<DeleteVoteBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.from('tournament_votes').delete().eq('uuid', voteUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
