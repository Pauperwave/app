// server\utils\telegram\commands\supporto.ts
import type { Bot } from 'grammy'

// ForceReply guarantees Telegram sends the user's next message as a reply
// to this exact one — matching its text is enough to recognize "this is a
// support message" with zero server-side session state (Nitro is
// serverless, same reasoning as linking.ts's own stateless email
// detection: no in-memory "waiting for this chat's reply" flag would
// survive a cold start).
const SUPPORT_PROMPT = 'Scrivimi il messaggio da inoltrare allo staff — rispondi a questo messaggio con quello che vuoi segnalare.'

// Only super_admin, not admin+super_admin like notify.ts's
// notifyTelegramAdmins — a support request needs one point of
// accountability to actually pick it up, same reasoning already applied to
// notifyTelegramSuperAdmins for technical errors.
async function notifySuperAdminsOfSupportRequest(
  chatId: number, username: string | undefined, message: string
) {
  const supabase = telegramServiceSupabaseClient()

  const { data: chatIds, error } = await supabase.rpc('get_admin_telegram_chat_ids', {
    p_roles: ['super_admin']
  })
  if (error) {
    console.error('Failed to resolve Telegram super_admin recipients for /supporto:', error.message)
    return
  }

  const associateUuid = await resolveAssociateUuidByChatId(chatId)
  const sender = username ? `@${username}` : `chat ${chatId}`
  const from = associateUuid ? `${sender} (socio collegato)` : sender

  const text = `🆘 Richiesta di supporto da ${from}:\n\n${message}`

  const results = await Promise.allSettled(
    (chatIds ?? []).map(adminChatId => sendTelegramMessage(adminChatId, text))
  )
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to forward /supporto message to a super_admin:', result.reason)
    }
  }
}

export function registerSupportoCommand(bot: Bot) {
  bot.command('supporto', async (ctx) => {
    await ctx.reply(SUPPORT_PROMPT, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Il tuo messaggio...'
      }
    })
  })

  // Registered before linking.ts's own catch-all (commands/index.ts keeps
  // that one last) so a support reply is checked first — it only ever acts
  // on replies to SUPPORT_PROMPT, calling next() for everything else,
  // linking's email detection included.
  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.reply_to_message?.text !== SUPPORT_PROMPT) {
      return next()
    }

    try {
      await notifySuperAdminsOfSupportRequest(ctx.chat.id, ctx.from?.username, ctx.message.text)
      await ctx.reply('✅ Messaggio inoltrato allo staff, ti risponderanno appena possibile.')
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a inoltrare il messaggio, riprova più tardi.')
    }
  })
}
