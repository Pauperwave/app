// server\utils\telegram\commands\supporto.ts
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { registerDeepLink } from '../deepLinks'

// ForceReply guarantees the user's next message replies to this exact one —
// matching its text recognizes a support message with zero server-side
// state (same stateless reasoning as linking.ts).
const SUPPORT_PROMPT = 'Scrivimi il messaggio da inoltrare allo staff — rispondi a questo messaggio con quello che vuoi segnalare.'

// Telegram usernames are optional — many members never set one, so a linked
// associate's registered name (already on file from tesseramento) is a more
// reliable identifier than asking every member to add a @username first.
async function resolveAssociateName(associateUuid: string): Promise<string | null> {
  const supabase = telegramServiceSupabaseClient()

  const { data, error } = await supabase
    .from('pauperwave_associates')
    .select('first_name, last_name')
    .eq('uuid', associateUuid)
    .maybeSingle()

  if (error || !data) return null
  return `${data.first_name} ${data.last_name}`
}

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
  const associateName = associateUuid ? await resolveAssociateName(associateUuid) : null
  const sender = associateName ?? (username ? `@${username}` : `chat ${chatId}`)
  const from = associateUuid ? `${sender} (socio collegato)` : sender

  const text = `🆘 Richiesta di supporto da ${from}:\n\n${message}\n\nRispondi a questo messaggio per rispondere al socio.`

  const results = await Promise.allSettled(
    (chatIds ?? []).map(async (adminChatId) => {
      const sent = await sendTelegramMessage(adminChatId, text)
      // Only way to later resolve "which member is this admin's reply for" —
      // Telegram has no notion of a conversation thread across two separate
      // chats, so this is the sole link between the two.
      const { error: threadError } = await supabase
        .from('pauperwave_telegram_support_threads')
        .insert({
          admin_chat_id: adminChatId,
          admin_message_id: sent.message_id,
          member_chat_id: chatId
        })
      if (threadError) {
        console.error('Failed to record /supporto reply thread:', threadError.message)
      }
    })
  )
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Failed to forward /supporto message to a super_admin:', result.reason)
    }
  }
}

// Reverse direction of notifySuperAdminsOfSupportRequest — an admin's reply
// (Telegram reply-to-message) to a forwarded 🆘 notification gets relayed
// back to the member's own chat. Not gated on the admin's role: only a
// super_admin's chat could ever hold a matching row here, since only they
// receive the original forward.
async function relaySupportReplyIfMatched(ctx: Context, next: () => Promise<void>) {
  const replyToMessageId = ctx.message?.reply_to_message?.message_id
  if (!replyToMessageId || !ctx.chat || !ctx.message?.text) {
    return next()
  }

  const supabase = telegramServiceSupabaseClient()
  const { data: thread, error } = await supabase
    .from('pauperwave_telegram_support_threads')
    .select('member_chat_id')
    .eq('admin_chat_id', ctx.chat.id)
    .eq('admin_message_id', replyToMessageId)
    .maybeSingle()

  if (error) {
    console.error('Failed to resolve /supporto reply thread:', error.message)
    return next()
  }
  if (!thread) {
    return next()
  }

  try {
    await sendTelegramMessage(thread.member_chat_id, `💬 Risposta dallo staff:\n\n${ctx.message.text}`)
    await ctx.reply('✅ Risposta inoltrata al socio.')
  } catch {
    await ctx.reply('⚠️ Non sono riuscito a inoltrare la risposta, riprova più tardi.')
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

  // Registered before the member-side handler below — an admin's reply
  // never matches SUPPORT_PROMPT, so ordering between the two doesn't
  // matter for correctness, but checking the DB-backed thread first avoids
  // relying on that always staying true.
  bot.on('message:text', relaySupportReplyIfMatched)

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
