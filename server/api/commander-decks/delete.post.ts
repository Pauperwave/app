// server\api\commander-decks\delete.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface DeleteDeckBody {
  deckUuid: string
}

// Blocks deleting a deck already played in a real tournament (the deck table disables the button
// too): it would orphan tournament_round_results.commander_deck_uuid for every round it was used.
// Test tournaments don't count: their results are throwaway.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { deckUuid } = await readBody<DeleteDeckBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { count, error: usageError } = await supabase
    .from('tournament_round_results')
    .select('id, tournaments!inner(is_test)', { count: 'exact', head: true })
    .eq('commander_deck_uuid', deckUuid)
    .eq('tournaments.is_test', false)

  if (usageError) {
    throw createError({ statusCode: 500, statusMessage: usageError.message })
  }
  if (count && count > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Deck has been played in a tournament' })
  }

  const { error } = await supabase
    .from('commander_decks')
    .delete()
    .eq('uuid', deckUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
