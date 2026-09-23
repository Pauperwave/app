// server\api\commander-decks\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateDeckBody {
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

// Manually registers a deck for a player, independent of the get-or-create
// flow in select.post.ts (which only fires during live round-commander
// selection) — restores league's DeckCreateModal flow so staff can
// pre-register a deck before a tournament (user request, 2026-09-17).
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
    // uq_commander_decks_single / uq_commander_decks_partner — this player
    // already has a deck for this exact commander/partner combo.
    const statusCode = error.code === '23505' ? 409 : 500
    throw createError({ statusCode, statusMessage: error.message })
  }

  return { deckUuid: data.uuid }
})
