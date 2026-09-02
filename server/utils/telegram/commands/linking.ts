// server\utils\telegram\commands\linking.ts
import type { Bot } from 'grammy'

// No conversation state: Nitro runs on Vercel (serverless), so nothing
// guarantees the process that handles a user's later reply is the same one
// that handled /start — an in-memory "waiting for this chat's email" flag
// wouldn't survive a cold start. Instead: any plain-text message that looks
// like an email is treated as a linking attempt, unconditionally. Simpler
// and stateless, at the cost of not being able to say "reply to my prompt
// specifically" — acceptable since the only other thing a chat sends as
// plain text is nothing (everything else is a /command).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Shared with tornei.ts's self-registration button — a chat can only
// register the associate it's linked to, resolved server-side the same way
// self-register.post.ts resolves it from the web session, just keyed by
// chat_id instead of a Supabase auth user.
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

  // Delete any existing row for this chat first — upsert on associate_uuid
  // alone can't also resolve a conflict on chat_id's own unique constraint
  // (re-linking the same Telegram chat to a different associate would hit
  // it otherwise).
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
