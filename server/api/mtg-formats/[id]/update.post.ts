// server\api\mtg-formats\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewMtgFormatPayload } from '#shared/types/mtgFormats'

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<NewMtgFormatPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: format, error } = await supabase
    .from('mtg_formats')
    .update({ name: body.name })
    .eq('id', id)
    .select()
    .single()

  if (error || !format) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Format update failed'
    })
  }

  return { format }
})
