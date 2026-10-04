// server\utils\telegram\commands\account\linking.ts
import type { Bot, Context } from 'grammy'
import { ICONS } from '../../icons'

// No conversation state: Nitro is serverless, so an in-memory "waiting for email" flag wouldn't
// survive a cold start. Any plain-text message that looks like an email is treated as a linking
// attempt instead.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A chat can only register the associate it's linked to (as self-register.post.ts does from a web
// session)
export async function resolveAssociateUuidByChatId(chatId: number): Promise<string | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('associate_uuid')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (error) throw error
  return data?.associate_uuid ?? null
}

// Reverse of resolveAssociateUuidByChatId, for server-initiated contact (e.g. a pairing
// notification: the trigger knows the associate_uuid, not the chat_id)
export async function resolveChatIdByAssociateUuid(associateUuid: string): Promise<number | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_associate_telegram_links')
    .select('chat_id')
    .eq('associate_uuid', associateUuid)
    .maybeSingle()

  if (error) throw error
  return data?.chat_id ?? null
}

// Shown by tessera.ts, iscrizioni.ts and detail.ts's iscrivi: handler for a personal action before
// linking
export const NOT_LINKED_MESSAGE = 'Devi prima collegare il tuo account: scrivimi la tua email da socio.'

// Shared "get chatId, resolve it, else NOT_LINKED_MESSAGE" prelude; callers still catch its
// Supabase-error throw
export async function requireLinkedAssociate(ctx: Context): Promise<string | null> {
  const chatId = ctx.chat?.id
  if (!chatId) return null

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  if (!associateUuid) {
    await ctx.replyWithRichMessage({ markdown: NOT_LINKED_MESSAGE })
    return null
  }
  return associateUuid
}

// Rate-limits linking attempts per chat: otherwise a chat could enumerate member emails by typing
// many and reading the different replies. One row per attempt, counted over the last N minutes.
const MAX_LINK_ATTEMPTS = 1
const LINK_ATTEMPT_WINDOW_MINUTES = 1

// Returns false (recording nothing) once the window is full. Fails closed on Supabase errors:
// allowing everything through on an infra hiccup would defeat the rate limit
async function recordLinkAttempt(chatId: number): Promise<boolean> {
  const supabase = telegramServiceSupabaseClient()
  const windowStart = new Date(Date.now() - LINK_ATTEMPT_WINDOW_MINUTES * 60_000).toISOString()

  // Table-wide cleanup: every attempt from any chat sweeps stale rows, so no separate cron is
  // needed at this scale
  await supabase
    .from('pauperwave_telegram_link_attempts')
    .delete()
    .lt('attempted_at', windowStart)

  const { count, error: countError } = await supabase
    .from('pauperwave_telegram_link_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .gte('attempted_at', windowStart)

  if (countError) throw countError
  if ((count ?? 0) >= MAX_LINK_ATTEMPTS) return false

  const { error: insertError } = await supabase
    .from('pauperwave_telegram_link_attempts')
    .insert({ chat_id: chatId })

  if (insertError) throw insertError
  return true
}

async function linkChat(
  chatId: number, email: string, telegramUsername: string | null
): Promise<string> {
  const supabase = telegramServiceSupabaseClient()

  const { data: associate, error: associateError } = await supabase
    .from('pauperwave_associates')
    .select('uuid, first_name')
    .eq('email_address', email)
    .eq('membership_request_status', 'approved')
    .maybeSingle()

  if (associateError) throw associateError
  if (!associate) {
    return `${ICONS.failure} Nessun tesseramento approvato trovato con questa email. `
      + 'Controlla di averla scritta correttamente, oppure contatta un admin.'
  }

  // Refuse to take the link from a chat that already has it: the upsert below is keyed on
  // associate_uuid alone, and an email isn't a secret, so anyone knowing it could otherwise hijack
  // the link
  const existingChatId = await resolveChatIdByAssociateUuid(associate.uuid)
  if (existingChatId !== null && existingChatId !== chatId) {
    return `${ICONS.warning} Questa email è già collegata a un'altra chat. `
      + 'Se è la tua email e hai perso l\'accesso a quella chat, contatta un admin per scollegarla.'
  }

  // Delete any existing row first: an upsert on associate_uuid can't also resolve a chat_id unique
  // conflict
  await supabase.from('pauperwave_associate_telegram_links').delete().eq('chat_id', chatId)

  const { error: linkError } = await supabase
    .from('pauperwave_associate_telegram_links')
    .upsert(
      { associate_uuid: associate.uuid, chat_id: chatId, telegram_username: telegramUsername },
      { onConflict: 'associate_uuid' }
    )

  if (linkError) throw linkError

  return `${ICONS.success} Collegato come ${associate.first_name}! D'ora in poi i comandi personalizzati useranno il tuo account.`
}

export function registerLinkingHandler(bot: Bot) {
  // Registered last (commands/index.ts) so every /command matches its own handler first; this only
  // sees unclaimed plain text
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text.trim()

    if (text.startsWith('/') || !EMAIL_PATTERN.test(text)) {
      return next()
    }

    const chatId = ctx.chat.id
    let allowed: boolean
    try {
      allowed = await recordLinkAttempt(chatId)
    } catch {
      await ctx.reply(`${ICONS.warning} Errore nel collegamento, riprova più tardi.`)
      return
    }
    if (!allowed) {
      // Limits aren't interpolated: "1 tentativo ogni 1 minuti" reads wrong, and a generic text
      // survives changes
      await ctx.reply(`${ICONS.warning} Troppi tentativi di collegamento. Riprova tra qualche minuto.`)
      return
    }

    const reply = await linkChat(chatId, text.toLowerCase(), ctx.from?.username ?? null)
      .catch(() => `${ICONS.warning} Errore nel collegamento, riprova più tardi.`)

    await ctx.reply(reply)
  })
}
