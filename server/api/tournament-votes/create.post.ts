// server\api\tournament-votes\create.post.ts
import type { PairingWriteContext } from '~~/server/utils/tournaments/definePairingWriteHandler'

interface CreateVoteBody {
  tournamentUuid: string
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  voteType: 'brew' | 'play'
}

export default definePairingWriteHandler(
  async ({ supabase, body }: PairingWriteContext<CreateVoteBody>) => {
    await castVote(supabase, body)

    return { success: true }
  }
)
