// server\api\mtg-formats\[id]\update.post.ts
import type { NewMtgFormatPayload } from '#shared/types/mtgFormats'

export default defineEventHandler(async (event) => {
  const { id, body, supabase } = await parseIdMutationRequest<NewMtgFormatPayload>(event)

  const { data: format, error } = await supabase
    .from('mtg_formats')
    .update({ name: body.name, color: body.color })
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
