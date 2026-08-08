// server\api\wanted-cards\[id]\refresh-prices.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

// Stessa permission di status.post.ts/update.post.ts: ogni scrittura sulla
// riga (oltre alla creazione) è riservata alla gestione — vedi migrazione
// 20260807190720 e il commento in useWantedCardsRowActions.ts.
export default defineEventHandler(async (event) => {
  const user = await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: card, error: fetchError } = await supabase
    .from('pauperwave_wanted_cards')
    .select('scryfall_id, set_code, treatment, language')
    .eq('id', id)
    .single()

  if (fetchError || !card) {
    throw createError({ statusCode: 404, statusMessage: fetchError?.message ?? 'Wanted card not found' })
  }
  if (!card.scryfall_id || !card.set_code) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Richiesta senza scryfall_id/set_code — modificala una volta per popolarli'
    })
  }

  const token = useRuntimeConfig(event).cardTraderApiToken
  const { cardmarketPrice, cardtraderPrice } = await refreshWantedCardPrices(
    supabase, token, card.scryfall_id, card.set_code,
    card.treatment.includes('foil'), card.language
  )

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .update({
      cardmarket_price: cardmarketPrice,
      cardmarket_price_synced_at: cardmarketPrice !== null ? now : null,
      cardtrader_price: cardtraderPrice,
      cardtrader_price_synced_at: cardtraderPrice !== null ? now : null,
      ...await auditColumnsForUpdate(event, user)
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card price refresh failed' })
  }

  return { wantedCard: data }
})
