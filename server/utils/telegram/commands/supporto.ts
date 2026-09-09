// server\utils\telegram\commands\supporto.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'

// ForceReply guarantees the user's next message replies to this exact one —
// matching its text recognizes a support message with zero server-side
// state (same stateless reasoning as linking.ts).
const SUPPORT_PROMPT = 'Scrivimi il messaggio da inoltrare allo staff — rispondi a questo messaggio con quello che vuoi segnalare.'

// Only super_admin (not admin+super_admin like notifyTelegramAdmins) — one
// point of accountability, same reasoning as notifyTelegramSuperAdmins.
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

// Extracted so it can be reused verbatim by t.me/<bot>?start=supporto —
// see deepLinks.ts. NOT a Rich Message on purpose: a message sent via
// sendRichMessage has no .text field (RichMessageMessage carries
// .rich_message instead — see @grammyjs/types/message.d.ts), so
// ctx.message.reply_to_message?.text below would never match SUPPORT_PROMPT
// again and the whole force-reply correlation would silently break.
async function supportoCommandHandler(ctx: Context) {
  await ctx.reply(SUPPORT_PROMPT, {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: 'Il tuo messaggio...'
    }
  })
}

registerDeepLink('supporto', supportoCommandHandler)

export function registerSupportoCommand(bot: Bot, commands: CommandGroup<Context>) {
  commands.command('supporto', 'Inoltra un messaggio allo staff', supportoCommandHandler)

  // Registered before linking.ts's catch-all — only acts on replies to
  // SUPPORT_PROMPT, calling next() otherwise.
  bot.on('message:text', async (ctx, next) => {
    if (ctx.message.reply_to_message?.text !== SUPPORT_PROMPT) {
      return next()
    }

    try {
      await notifySuperAdminsOfSupportRequest(ctx.chat.id, ctx.from?.username, ctx.message.text)
      await ctx.replyWithRichMessage({
        markdown: '✅ Messaggio inoltrato allo staff, ti risponderanno appena possibile.'
      })
    } catch {
      await ctx.replyWithRichMessage({
        markdown: '⚠️ Non sono riuscito a inoltrare il messaggio, riprova più tardi.'
      })
    }
  })
}
