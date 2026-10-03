// server\api\tournament-match-results\upsert.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface UpsertMatchResultBody {
  tournamentUuid: string
  pairingUuid: string
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
}

// The pairing is marked completed right away, same rule as the Commander
// round-results upsert; a pending player report for it is dropped.
export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<UpsertMatchResultBody>) => {
    await saveMatchResult(supabase, body)

    return { success: true }
  }
)
