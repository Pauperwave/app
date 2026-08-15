// server\api\wanted-cards\[id]\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { WantedCardEditsPayload } from '#shared/types/wantedCards'

export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<WantedCardEditsPayload>(event)

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
      type_line: body.typeLine,
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

  const wantedCard = ensureWantedCardRow(data, error, 'update')
  // Changing edition/printing can point at a card that was never resolved before.
  prefetchCardTraderBlueprint(event, supabase, body.scryfallId, body.setCode)

  return { wantedCard }
})
