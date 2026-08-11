// server\api\wanted-cards\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { NewWantedCardPayload } from '#shared/types/wantedCards'

// Insert is open to any authenticated user — players create their own
// requests (see former migration 20260807200045, now enforced here instead
// of via RLS since the service-role client bypasses it).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<NewWantedCardPayload>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .insert({
      player_associate_uuid: body.playerAssociateUuid,
      card_name: body.cardName,
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
      ...await auditColumnsForInsert(event, user)
    })
    .select()
    .single()

  const wantedCard = ensureWantedCardRow(data, error, 'insert')
  prefetchCardTraderBlueprint(event, supabase, body.scryfallId, body.setCode)

  return { wantedCard }
})
