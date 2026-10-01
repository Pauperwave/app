// server\api\tournaments\[id]\test.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentTestBody {
  isTest: boolean
}

// Super_admin only: a test tournament is invisible to everyone else (RLS), so
// nobody below that tier could ever undo the flag. Marking it as a test also
// turns the Telegram notifications off — the switch can still be turned back on.
export default defineEventHandler(async (event) => {
  await requireSuperAdminPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { isTest } = await readBody<SetTournamentTestBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update(isTest
      ? { is_test: true, telegram_notifications_enabled: false }
      : { is_test: false })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament test flag update failed'
    })
  }

  return { tournament }
})
