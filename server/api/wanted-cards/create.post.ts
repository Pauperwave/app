// server\api\wanted-cards\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateWantedCardBody {
  playerAssociateUuid: string
  cardName: string
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

// Insert is open to any authenticated user — players create their own
// requests (see former migration 20260807200045, now enforced here instead
// of via RLS since the service-role client bypasses it).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<CreateWantedCardBody>(event)

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

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card insert failed' })
  }

  // Prefetch in background: scalda la cache CardTrader (server/utils/
  // cardTrader.ts) così il bottone "Cerca su CardTrader" trova già la riga
  // pronta invece di aspettare il resolve al click. Non blocca la risposta
  // — il fallimento è silenzioso, il resolve on-demand riproverà comunque.
  const token = useRuntimeConfig(event).cardTraderApiToken
  if (token) {
    resolveCardTraderBlueprint(supabase, token, body.scryfallId, body.setCode).catch(() => {})
  }

  return { wantedCard: data }
})
