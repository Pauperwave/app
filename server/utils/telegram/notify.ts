// server\utils\telegram\notify.ts
import type { H3Event } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateNotifyResult } from '#shared/types/notifications'

// Chat ids are Telegram's, not this app's user/associate ids — the caller
// must already know which chat to target. Returns the sent Message so
// callers needing its message_id (e.g. supporto.ts's reply-thread mapping)
// don't have to call bot.api.sendMessage themselves.
export async function sendTelegramMessage(chatId: number | string, text: string) {
  const bot = useTelegramBot()
  return bot.api.sendMessage(chatId, text)
}

// Recipients resolved from the database, not a hardcoded chat id — a static
// env var wouldn't follow role changes. The join lives in
// get_admin_telegram_chat_ids() (Postgres function) since user_roles and
// players both reference auth.users independently, no FK to embed across.
//
// Best-effort: a Telegram/DB hiccup here must never fail a request that
// already succeeded (e.g. a tesseramento application) — errors are logged.
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

// Domain events an admin/organizer needs to act on (new tesseramento or
// renewal request) — both roles, the default of get_admin_telegram_chat_ids().
export async function notifyTelegramAdmins(event: H3Event, text: string) {
  await notifyByRole(event, text)
}

// Technical errors — super_admin only, a single point of accountability
// instead of spreading system alerts across every admin.
export async function notifyTelegramSuperAdmins(event: H3Event, text: string) {
  await notifyByRole(event, text, ['super_admin'])
}

export interface AssociateMessage {
  associateUuid: string
  text: string
}

// Passive per-player notifications. One text per associate (a table
// announcement differs for everyone), unlinked associates are counted, not
// errors. Never throws — the caller's write already succeeded.
export async function notifyTelegramAssociates(
  messages: AssociateMessage[]
): Promise<AssociateNotifyResult> {
  if (messages.length === 0) return { sent: 0, notLinked: 0, failed: 0 }

  const supabase = telegramServiceSupabaseClient()

  const { data: links, error } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('associate_uuid, chat_id')
    .in('associate_uuid', messages.map(message => message.associateUuid))
  if (error) {
    console.error('Failed to resolve Telegram recipients:', error.message)
    return { sent: 0, notLinked: 0, failed: messages.length }
  }

  const chatIdByAssociate = new Map((links ?? []).map(link => [link.associate_uuid, link.chat_id]))
  const linkedMessages = messages.flatMap((message) => {
    const chatId = chatIdByAssociate.get(message.associateUuid)
    return chatId === undefined ? [] : [{ chatId, text: message.text }]
  })

  const results = await Promise.allSettled(
    linkedMessages.map(message => sendTelegramMessage(message.chatId, message.text))
  )
  const rejected = results.filter(result => result.status === 'rejected')
  for (const result of rejected) {
    console.error('Failed to send Telegram player notification:', result.reason)
  }

  return {
    sent: results.length - rejected.length,
    notLinked: messages.length - linkedMessages.length,
    failed: rejected.length
  }
}
