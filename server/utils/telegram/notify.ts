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
// The join itself (user_roles -> players -> pauperwave_associate_telegram_links)
// lives in get_admin_telegram_chat_ids() (migration 20260902102812) rather
// than three separate queries here — user_roles.user_id and players.user_id
// both reference auth.users independently, no FK PostgREST could embed across.
export async function notifyTelegramAdmins(event: H3Event, text: string) {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: chatIds, error } = await supabase.rpc('get_admin_telegram_chat_ids')
  if (error) throw error

  await Promise.all((chatIds ?? []).map(chatId => sendTelegramMessage(chatId, text)))
}
