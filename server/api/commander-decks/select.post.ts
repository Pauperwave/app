// server\api\commander-decks\select.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SelectCommanderBody {
  pairingUuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
}

// Get-or-create the player's commander_decks row for this exact commander/
// partner combo (uq_commander_decks_single/uq_commander_decks_partner
// already enforce "one deck per player per combo" — reuse the same query the
// unique index does with `.select()` first, since Supabase JS has no
// `ON CONFLICT ... DO NOTHING RETURNING existing row` upsert-and-fetch in one
// call for a partial-unique-index target), then point this pairing's round
// result at it.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<SelectCommanderBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  let deckQuery = supabase
    .from('commander_decks')
    .select('uuid')
    .eq('player_uuid', body.playerUuid)
    .eq('commander_1_name', body.commander1Name)

  deckQuery = body.commander2Name
    ? deckQuery.eq('commander_2_name', body.commander2Name)
    : deckQuery.is('commander_2_name', null)

  const { data: existingDeck, error: findError } = await deckQuery.maybeSingle()

  if (findError) {
    throw createError({ statusCode: 500, statusMessage: findError.message })
  }

  let deckUuid = existingDeck?.uuid

  if (!deckUuid) {
    const { data: createdDeck, error: insertError } = await supabase
      .from('commander_decks')
      .insert({
        player_uuid: body.playerUuid,
        commander_1_name: body.commander1Name,
        commander_2_name: body.commander2Name
      })
      .select('uuid')
      .single()

    if (insertError) {
      throw createError({ statusCode: 500, statusMessage: insertError.message })
    }
    deckUuid = createdDeck.uuid
  }

  const { error: updateError } = await supabase
    .from('tournament_round_results')
    .update({ commander_deck_uuid: deckUuid })
    .eq('pairing_uuid', body.pairingUuid)
    .eq('player_uuid', body.playerUuid)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError.message })
  }

  return { deckUuid }
})
