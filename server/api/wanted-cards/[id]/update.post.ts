// server\api\wanted-cards\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateWantedCardBody {
  playerAssociateUuid: string
  scryfallUrl: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  price: number | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateWantedCardBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .update({
      player_associate_uuid: body.playerAssociateUuid,
      scryfall_url: body.scryfallUrl,
      mana_cost: body.manaCost || null,
      color_identity: body.colorIdentity,
      cmc: body.cmc,
      image_url: body.imageUrl,
      price: body.price,
      copies: body.copies,
      language: body.language,
      treatment: body.treatment,
      notes: body.notes,
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card update failed' })
  }

  return { wantedCard: data }
})
