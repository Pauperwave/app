// server\utils\telegram\commands\account\linking.ts
import type { Bot, Context } from 'grammy'

// No conversation state: Nitro is serverless, so an in-memory "waiting for
// this chat's email" flag wouldn't survive a cold start. Instead, any
// plain-text message that looks like an email is treated as a linking
// attempt — simpler, at the cost of not requiring a reply to a specific prompt.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// A chat can only register the associate it's linked to — same resolution
// self-register.post.ts does from a web session, keyed by chat_id instead.
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

// Reverse of resolveAssociateUuidByChatId — needed wherever the server (not
// an incoming Telegram update) is the one initiating contact, e.g. pushing a
// pairing notification once tournament_pairings gets a live-write flow: the
// trigger knows the associate_uuid, not the chat_id.
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

// Same literal message tessera.ts, iscrizioni.ts, and tournament/detail.ts's
// iscrivi: handler all show for a personal action before linking an account.
export const NOT_LINKED_MESSAGE = 'Devi prima collegare il tuo account: scrivimi la tua email da socio.'

// Shared "get chatId, resolve it, bail out with NOT_LINKED_MESSAGE" prelude
// — callers still catch this function's own Supabase-error throw themselves.
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

// Rate-limits linking attempts per chat — without this, any chat could
// brute-force/enumerate member emails by typing many in a row and reading
// the bot's different responses (not found / already linked elsewhere /
// success). One row per attempt (see the migration's own comment for why),
// so this is a plain "how many in the last N minutes" range query.
const MAX_LINK_ATTEMPTS = 5
const LINK_ATTEMPT_WINDOW_MINUTES = 15

// Returns false (and does not record a new attempt) once the window's
// already full — fails closed on its own Supabase errors, since silently
// allowing every attempt through on an infra hiccup would defeat the point
// of a rate limit specifically meant to resist abuse.
async function recordLinkAttempt(chatId: number): Promise<boolean> {
  const supabase = telegramServiceSupabaseClient()
  const windowStart = new Date(Date.now() - LINK_ATTEMPT_WINDOW_MINUTES * 60_000).toISOString()

  // Opportunistic cleanup of this chat's own stale rows — keeps the table
  // self-bounding without a separate cron job.
  await supabase
    .from('pauperwave_telegram_link_attempts')
    .delete()
    .eq('chat_id', chatId)
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

async function linkChat(chatId: number, email: string): Promise<string> {
  const supabase = telegramServiceSupabaseClient()

  const { data: associate, error: associateError } = await supabase
    .from('pauperwave_associates')
    .select('uuid, first_name')
    .eq('email_address', email)
    .eq('membership_request_status', 'approved')
    .maybeSingle()

  if (associateError) throw associateError
  if (!associate) {
    return '❌ Nessun tesseramento approvato trovato con questa email. '
      + 'Controlla di averla scritta correttamente, oppure contatta un admin.'
  }

  // Refuse to silently steal the link away from whatever chat already has
  // it — the upsert below is keyed on associate_uuid alone (onConflict),
  // so without this check it would just transfer the link here with no
  // trace. An email address isn't a secret, so anyone who knows (or
  // guesses) a member's registered email could otherwise hijack their
  // link by typing it into a different chat.
  const existingChatId = await resolveChatIdByAssociateUuid(associate.uuid)
  if (existingChatId !== null && existingChatId !== chatId) {
    return '⚠️ Questa email è già collegata a un\'altra chat. '
      + 'Se è la tua email e hai perso l\'accesso a quella chat, contatta un admin per scollegarla.'
  }

  // Delete any existing row first — upsert on associate_uuid alone can't
  // also resolve a conflict on chat_id's own unique constraint.
  await supabase.from('pauperwave_associate_telegram_links').delete().eq('chat_id', chatId)

  const { error: linkError } = await supabase
    .from('pauperwave_associate_telegram_links')
    .upsert(
      { associate_uuid: associate.uuid, chat_id: chatId },
      { onConflict: 'associate_uuid' }
    )

  if (linkError) throw linkError

  return `✅ Collegato come ${associate.first_name}! D'ora in poi i comandi personalizzati useranno il tuo account.`
}

export function registerLinkingHandler(bot: Bot) {
  // Registered last (commands/index.ts) so every /command is matched by its
  // own handler first — this only ever sees plain-text messages nothing
  // else claimed.
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
      await ctx.reply('⚠️ Errore nel collegamento, riprova più tardi.')
      return
    }
    if (!allowed) {
      await ctx.reply(
        `⚠️ Troppi tentativi di collegamento. Riprova tra qualche minuto (max ${MAX_LINK_ATTEMPTS} ogni ${LINK_ATTEMPT_WINDOW_MINUTES} minuti).`
      )
      return
    }

    const reply = await linkChat(chatId, text.toLowerCase())
      .catch(() => '⚠️ Errore nel collegamento, riprova più tardi.')

    await ctx.reply(reply)
  })
}
