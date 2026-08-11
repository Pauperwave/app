// server\api\wanted-cards\[id]\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase
    .from('pauperwave_wanted_cards')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { deleted: true }
})
