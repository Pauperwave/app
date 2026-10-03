// server\api\tournament-kills\create.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface CreateKillBody {
  tournamentUuid: string
  pairingUuid: string
  killerUuid: string
  killedPlayerUuid: string
}

export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<CreateKillBody>) => {
    await recordKill(supabase, body)

    return { success: true }
  }
)
