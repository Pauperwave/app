// server\api\tournament-rounds\reset-pairing.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface ResetPairingBody {
  pairingUuid: string
}

// Clears one pairing's entered data (ranking, kills, votes) — migration
// 20260919000000. "Reset tavolo", ported from league (PairingsCard.vue).
export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<ResetPairingBody>) => {
    const { error } = await supabase.rpc('reset_commander_pairing', {
      p_pairing_uuid: body.pairingUuid
    })
    assertRoundRpcOk(error)

    return { success: true }
  }
)
