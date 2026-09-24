// server\api\commander-decks\select.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SelectCommanderBody {
  pairingUuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<SelectCommanderBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: pairing, error: pairingError } = await supabase
    .from('tournament_pairings')
    .select('tournament_uuid')
    .eq('uuid', body.pairingUuid)
    .single()
  if (pairingError) {
    throw createError({ statusCode: 500, statusMessage: pairingError.message })
  }

  const deckUuid = await selectCommanderDeck(supabase, {
    tournamentUuid: pairing.tournament_uuid, ...body
  })

  return { deckUuid }
})
