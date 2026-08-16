// server\api\mtg-formats\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewMtgFormatPayload } from '#shared/types/mtgFormats'

// Same BFF convention as locations/create.post.ts: every write goes through
// requireManagementPermission, not RLS evaluated from the client.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)
  const body = await readBody<NewMtgFormatPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: format, error } = await supabase
    .from('mtg_formats')
    .insert({
      name: body.name,
      description: body.description
    })
    .select()
    .single()

  if (error || !format) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Format creation failed'
    })
  }

  return { format }
})
