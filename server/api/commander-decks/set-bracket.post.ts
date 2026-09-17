// server\api\commander-decks\set-bracket.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetBracketBody {
  deckUuid: string
  bracketLevel: number
}

// Sets a deck's power-level "Bracket" rating (1-5, migration
// 20260919030000) — ported from league's deck.bracket flow, adapted to this
// app's commander_decks table.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { deckUuid, bracketLevel } = await readBody<SetBracketBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase
    .from('commander_decks')
    .update({ bracket_level: bracketLevel })
    .eq('uuid', deckUuid)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { success: true }
})
