// server\api\associates\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateEditsPayload } from '#shared/types/associates'

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<AssociateEditsPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .update({
      ...body,
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Associate update failed'
    })
  }

  return { associate: data }
})
