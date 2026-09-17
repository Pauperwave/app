// server\api\commander-decks\update.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface UpdateDeckBody {
  deckUuid: string
  companionName: string | null
  decklistUrl: string | null
  isBorrowed: boolean
  lenderUuid: string | null
}

// Updates a deck's ownership/companion/decklist fields — deliberately
// excludes commander1/commander2 (changing those would silently orphan any
// tournament_round_results already tied to this deck's identity) and
// bracket_level (handled by its own set-bracket.post.ts).
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<UpdateDeckBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase
    .from('commander_decks')
    .update({
      companion_name: body.companionName,
      decklist_url: body.decklistUrl,
      is_borrowed: body.isBorrowed,
      lender_uuid: body.isBorrowed ? body.lenderUuid : null
    })
    .eq('uuid', body.deckUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
