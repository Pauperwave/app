// server\api\associates\reject.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface RejectAssociatesBody {
  ids: number[]
}

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const { ids } = await readBody<RejectAssociatesBody>(event)
  if (!ids?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No associate ids provided'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({ membership_request_status: 'rejected', ...await auditColumnsForUpdate(event, user) })
    .in('id', ids)
    .select()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message ?? 'Associates rejection failed'
    })
  }

  return { associates: data }
})
