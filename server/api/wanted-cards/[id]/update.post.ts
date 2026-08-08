// server\api\wanted-cards\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateWantedCardBody {
  playerAssociateUuid: string
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateWantedCardBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .update({
      player_associate_uuid: body.playerAssociateUuid,
      copies: body.copies,
      language: body.language,
      treatment: body.treatment,
      notes: body.notes
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card update failed' })
  }

  return { wantedCard: data }
})
