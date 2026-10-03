// server\api\tournament-kills\none.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface SetNoKillsBody {
  pairingUuid: string
  noKills: boolean
}

// Confirms (or retracts) that a table ended without any kill.
export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<SetNoKillsBody>) => {
    await setPairingNoKills(supabase, body)

    return { success: true }
  }
)
