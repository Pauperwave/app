// server\api\associates\[id]\update.post.ts
import type { AssociateEditsPayload } from '#shared/types/associates'

export default defineEventHandler(async (event) => {
  const {
    user, id, body, supabase
  } = await parseIdMutationRequest<AssociateEditsPayload>(event)

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
