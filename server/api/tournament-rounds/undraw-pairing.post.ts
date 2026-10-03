// server\api\tournament-rounds\undraw-pairing.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface UndrawPairingBody {
  pairingUuid: string
}

// Undoes a "Patta" declaration: clears ranking + kills only, commander/vote data stay
export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<UndrawPairingBody>) => {
    const { error } = await supabase.rpc('undraw_commander_pairing', {
      p_pairing_uuid: body.pairingUuid
    })
    assertRoundRpcOk(error)

    return { success: true }
  }
)
