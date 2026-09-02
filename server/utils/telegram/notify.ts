// server\utils\telegram\notify.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '#shared/utils/types/database'

// Chat ids are Telegram's, not this app's user/associate ids — the caller
// must already know which chat to target.
export async function sendTelegramMessage(chatId: number | string, text: string) {
  const bot = useTelegramBot()
  await bot.api.sendMessage(chatId, text)
}

// Resolves recipients from the database, not a hardcoded chat id — deliberate
// (docs/architecture/telegram-bot.md, decision 2026-09-02): a static
// TELEGRAM_ADMIN_CHAT_ID env var doesn't follow role changes (an admin
// promoted/demoted in /settings/members would need a manual env var update).
// user_roles.user_id and players.user_id both point at auth.users but aren't
// directly related by FK, so PostgREST can't nest this into a single
// `.select()` — three small queries instead, acceptable for a low-frequency
// admin alert, not a hot path.
export async function notifyTelegramAdmins(event: H3Event, text: string) {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: admins, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'super_admin'])
  if (rolesError) throw rolesError
  if (!admins.length) return

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('associate_uuid')
    .in('user_id', admins.map(admin => admin.user_id))
  if (playersError) throw playersError
  if (!players.length) return

  const { data: links, error: linksError } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('chat_id')
    .in('associate_uuid', players.map(player => player.associate_uuid))
  if (linksError) throw linksError

  await Promise.all(links.map(link => sendTelegramMessage(link.chat_id, text)))
}
