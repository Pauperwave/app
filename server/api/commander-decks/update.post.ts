// server\api\commander-decks\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateDeckBody {
  // fallow-ignore-next-line code-duplication -- deck write handlers kept explicit per endpoint
  deckUuid: string
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

// Updates ownership/companion/decklist fields, for the deck's owner or an admin. Excludes commander1/commander2 (changing them would
// orphan tournament_round_results tied to the deck) and bracket_level (see set-bracket.post.ts).
export default defineEventHandler(async (event) => {
  const body = await readBody<UpdateDeckBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await requireAdminOrDeckOwner(event, supabase, body.deckUuid)

  const { error } = await supabase
    .from('commander_decks')
    .update({
      companion_name: body.companionName,
      decklist_url: body.decklistUrl,
      is_borrowed: body.isBorrowed,
      lender_uuid: lenderUuidForBorrowed(body.isBorrowed, body.lenderUuid)
    })
    .eq('uuid', body.deckUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
