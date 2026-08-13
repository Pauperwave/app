// server\api\associates\restore.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface RestoreAssociatesBody {
  ids: number[]
}

// Reverts a rejected membership request back to 'pending', putting it back
// into the triage queue — the counterpart to reject.post.ts.
export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const { ids } = await readBody<RestoreAssociatesBody>(event)
  if (!ids?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No associate ids provided'
    })
  }

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({ membership_request_status: 'pending', ...await auditColumnsForUpdate(event, user) })
    .in('id', ids)
    .select()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message ?? 'Associates restore failed'
    })
  }

  return { associates: data }
})
