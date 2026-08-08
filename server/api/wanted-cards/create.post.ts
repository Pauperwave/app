// server\api\wanted-cards\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateWantedCardBody {
  playerAssociateUuid: string
  cardName: string
  scryfallUrl: string
  manaCost: string
  colorIdentity: string[]
  cmc: number
  imageUrl: string | null
  copies: number
  language: string | null
  treatment: string[]
  notes: string | null
}

// Insert is open to any authenticated user — players create their own
// requests (see former migration 20260807200045, now enforced here instead
// of via RLS since the service-role client bypasses it).
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const body = await readBody<CreateWantedCardBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('pauperwave_wanted_cards')
    .insert({
      player_associate_uuid: body.playerAssociateUuid,
      card_name: body.cardName,
      scryfall_url: body.scryfallUrl,
      mana_cost: body.manaCost || null,
      color_identity: body.colorIdentity,
      cmc: body.cmc,
      image_url: body.imageUrl,
      copies: body.copies,
      language: body.language,
      treatment: body.treatment,
      notes: body.notes
    })
    .select()
    .single()

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Wanted card insert failed' })
  }

  return { wantedCard: data }
})
