// server\api\commander-decks\clear.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface ClearCommanderBody {
  pairingUuid: string
  playerUuid: string
}

export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<ClearCommanderBody>) => {
    await clearCommanderDeck(supabase, body)

    return { success: true }
  }
)
