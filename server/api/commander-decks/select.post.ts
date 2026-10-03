// server\api\commander-decks\select.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface SelectCommanderBody {
  pairingUuid: string
  playerUuid: string
  commander1Name: string
  commander2Name: string | null
}

export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<SelectCommanderBody>) => {
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
  }
)
