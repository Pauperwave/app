// server\api\tournament-rounds\reopen.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface ReopenTournamentBody {
  tournamentUuid: string
}

// The way back from "Termina torneo" (migration 20261003100000): puts a completed tournament and its
// last round back in progress, deleting nothing — format-agnostic, same RPC for Commander and 1v1.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const { tournamentUuid } = await readBody<ReopenTournamentBody>(event)
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { error } = await supabase.rpc('reopen_tournament', { p_tournament_uuid: tournamentUuid })
  assertRoundRpcOk(error)

  return { success: true }
})
