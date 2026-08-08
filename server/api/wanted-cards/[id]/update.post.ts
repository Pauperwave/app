// server\api\wanted-cards\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateWantedCardBody {
  playerAssociateUuid: string
  scryfallUrl: string
  scryfallId: string
  setCode: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  cardmarketPrice: number | null
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
      scryfall_id: body.scryfallId,
      set_code: body.setCode,
      mana_cost: body.manaCost || null,
      color_identity: body.colorIdentity,
      cmc: body.cmc,
      image_url: body.imageUrl,
      cardmarket_price: body.cardmarketPrice,
      cardmarket_price_synced_at: body.cardmarketPrice !== null ? new Date().toISOString() : null,
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

  // Same background prefetch as create.post.ts — changing edition/printing can
  // point at a card that was never resolved before.
  const token = useRuntimeConfig(event).cardTraderApiToken
  if (token) {
    resolveCardTraderBlueprint(supabase, token, body.scryfallId, body.setCode).catch(() => {})
  }

  return { wantedCard: data }
})
