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
//
// Best-effort, same pattern as recordMembershipEvent (associateMembershipEvents.ts):
// a Telegram/DB hiccup here must never fail the request that already
// succeeded (e.g. a tesseramento application) — errors are logged, not thrown.
async function notifyByRole(event: H3Event, text: string, roles?: ('admin' | 'super_admin')[]) {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: chatIds, error } = await supabase.rpc('get_admin_telegram_chat_ids', { p_roles: roles })
  if (error) {
    console.error('Failed to resolve Telegram admin recipients:', error.message)
    return
  }

  const results = await Promise.allSettled(
    (chatIds ?? []).map(chatId => sendTelegramMessage(chatId, text))
  )
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to send Telegram admin notification:', result.reason)
    }
  }
}

// Domain events an admin/organizer needs to act on (new tesseramento
// request, renewal request) — both roles, default of
// get_admin_telegram_chat_ids().
export async function notifyTelegramAdmins(event: H3Event, text: string) {
  await notifyByRole(event, text)
}

// Technical errors — super_admin only, so there's a single point of
// accountability for intervening promptly rather than spreading system
// alerts across every admin (user request, 2026-09-02).
export async function notifyTelegramSuperAdmins(event: H3Event, text: string) {
  await notifyByRole(event, text, ['super_admin'])
}
