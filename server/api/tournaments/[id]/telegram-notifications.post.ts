// server\api\tournaments\[id]\telegram-notifications.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'

interface SetTournamentTelegramNotificationsBody {
  enabled: boolean
}

// Dedicated partial-update endpoint, same shape as [id]/pin.post.ts.
export default defineEventHandler(async (event) => {
  await requireManagementPermission(event)

  const id = Number(getRouterParam(event, 'id'))
  const { enabled } = await readBody<SetTournamentTelegramNotificationsBody>(event)

  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .update({ telegram_notifications_enabled: enabled })
    .eq('id', id)
    .select()
    .single()

  if (error || !tournament) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Tournament Telegram notifications update failed'
    })
  }

  return { tournament }
})
