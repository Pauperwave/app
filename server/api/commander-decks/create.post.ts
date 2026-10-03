// server\api\commander-decks\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateDeckBody {
  playerUuid: string
  commander1Name: string
  // fallow-ignore-next-line code-duplication -- deck write handlers kept explicit per endpoint
  commander2Name: string | null
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

// Manually registers a deck, independent of select.post.ts's get-or-create (live round selection),
// so staff can pre-register decks before a tournament.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<CreateDeckBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data, error } = await supabase
    .from('commander_decks')
    .insert({
      player_uuid: body.playerUuid,
      commander_1_name: body.commander1Name,
      commander_2_name: body.commander2Name,
      companion_name: body.companionName,
      decklist_url: body.decklistUrl,
      is_borrowed: body.isBorrowed,
      lender_uuid: lenderUuidForBorrowed(body.isBorrowed, body.lenderUuid)
    })
    .select('uuid')
    .single()

  if (error) {
    // uq_commander_decks_single / uq_commander_decks_partner: the player already has this
    // commander/partner combo
    const statusCode = error.code === '23505' ? 409 : 500
    throw createError({ statusCode, statusMessage: error.message })
  }

  return { deckUuid: data.uuid }
})
