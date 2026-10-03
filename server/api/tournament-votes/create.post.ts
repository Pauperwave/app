// server\api\tournament-votes\create.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface CreateVoteBody {
  tournamentUuid: string
  pairingUuid: string
  voterUuid: string
  votedPlayerUuid: string
  // fallow-ignore-next-line code-duplication -- same guard as the sibling handlers
  voteType: 'brew' | 'play'
}

export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const body = await readBody<CreateVoteBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)
  await assertPairingEditable(supabase, body.pairingUuid)
  await castVote(supabase, body)

  return { success: true }
})
