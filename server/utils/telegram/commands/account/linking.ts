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
    await ctx.reply(NOT_LINKED_MESSAGE)
    return null
  }
  return associateUuid
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

    const reply = await linkChat(ctx.chat.id, text.toLowerCase())
      .catch(() => '⚠️ Errore nel collegamento, riprova più tardi.')

    await ctx.reply(reply)
  })
}
