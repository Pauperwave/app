// server\api\tournament-kills\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteKillBody {
  killUuid: string
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { killUuid } = await readBody<DeleteKillBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.from('tournament_kills').delete().eq('uuid', killUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
