// server\api\tournament-match-results\delete.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface DeleteMatchResultBody {
  pairingUuid: string
}

// Removes one table's result and puts the pairing back to pending.
export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<DeleteMatchResultBody>) => {
    const { error: resultError } = await supabase
      .from('tournament_match_results')
      .delete()
      .eq('pairing_uuid', body.pairingUuid)

    if (resultError) {
      throw createError({ statusCode: 500, statusMessage: resultError.message })
    }

    const { error: statusError } = await supabase
      .from('tournament_pairings')
      .update({ status: 'pending' })
      .eq('uuid', body.pairingUuid)

    if (statusError) {
      throw createError({ statusCode: 500, statusMessage: statusError.message })
    }

    return { success: true }
  }
)
