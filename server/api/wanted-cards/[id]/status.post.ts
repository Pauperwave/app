// server\api\wanted-cards\[id]\status.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetWantedCardStatusBody {
  status: 'searching' | 'found' | 'abandoned'
}

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { status } = await readBody<SetWantedCardStatusBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .update({ status, ...await auditColumnsForUpdate(event, user) })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card status update failed' })
  }

  return { wantedCard: data }
})
