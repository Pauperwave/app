// server\utils\telegram\notify.ts
import type { H3Event } from 'h3'

import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '#shared/utils/types/database'
import type { AssociateNotifyResult } from '#shared/types/notifications'

// Chat ids are Telegram's, not this app's ids: the caller must know which chat to target. Returns
// the sent Message for callers needing its message_id (e.g. supporto.ts's reply-thread mapping).
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: SendTelegramOptions
) {
  const bot = useTelegramBot()
  return bot.api.sendMessage(chatId, text, options)
}

// Plain text unless the caller says its text is HTML (escaped with html.ts's escapeHtml)
interface SendTelegramOptions {
  parse_mode?: 'HTML'
}

// Recipients come from the database (a static env var wouldn't follow role changes). The join lives
// in the get_admin_telegram_chat_ids() Postgres function, since user_roles and players reference
// auth.users independently.
//
// Best-effort: a Telegram/DB hiccup must never fail a request that already succeeded; errors are
// logged.
async function notifyByRole(
  event: H3Event,
  text: string,
  roles?: ('admin' | 'super_admin')[],
  options?: SendTelegramOptions
) {
  const supabase = serverSupabaseServiceRole<Database>(event)

  const { data: chatIds, error } = await supabase.rpc('get_admin_telegram_chat_ids', { p_roles: roles })
  if (error) {
    console.error('Failed to resolve Telegram admin recipients:', error.message)
    return
  }

  const results = await Promise.allSettled(
    (chatIds ?? []).map(chatId => sendTelegramMessage(chatId, text, options))
  )
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to send Telegram admin notification:', result.reason)
    }
  }
}

// Domain events an admin/organizer must act on (new tesseramento or renewal request): both roles,
// the function's default
export async function notifyTelegramAdmins(event: H3Event, text: string) {
  await notifyByRole(event, text)
}

// Technical errors: super_admin only, one point of accountability instead of alerting every admin
export async function notifyTelegramSuperAdmins(
  event: H3Event,
  text: string,
  options?: SendTelegramOptions
) {
  await notifyByRole(event, text, ['super_admin'], options)
}

export interface AssociateMessage {
  associateUuid: string
  text: string
}

// Passive per-player notifications: one text per associate (a table announcement differs for
// everyone), unlinked associates are counted, not errors. Never throws: the caller's write already
// succeeded.
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
