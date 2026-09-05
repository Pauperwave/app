// server\utils\telegram\commands\visibilita.ts
import { InlineKeyboard } from 'grammy'
import { fetchShowExternalTournaments, setShowExternalTournaments } from './tournament/queries'
import { answerLoadError } from './callbackErrors'
import { FormattedString } from '@grammyjs/parse-mode'
import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

// Public, chat-scoped (not tied to a linked associate — pauperwave_telegram_chat_settings
// keys on chat_id alone, see migration 20260904160000) toggle for whether
// /calendario includes shop-organized tournaments (Magman etc., status
// 'external'). Hidden by default per fetchShowExternalTournaments' own
// fallback — this command is the only way to turn them on.
function renderVisibilita(
  showExternal: boolean
): { text: FormattedString, keyboard: InlineKeyboard } {
  const state = FormattedString.b(showExternal ? 'visibili' : 'nascosti')

  const text = fmt`👁️ ${FormattedString.b('Visibilità tornei')}\n\n🏪 I tornei di negozi esterni (es. Magman) sono ${state} in /calendario.`
  const keyboard = new InlineKeyboard().text(
    showExternal ? '🙈 Nascondi tornei esterni' : '👁️ Mostra tornei esterni',
    'visibilita:toggle'
  )

  return { text, keyboard }
}

export function registerVisibilitaCommand(bot: Bot, commands: CommandGroup<Context>) {
  commands.command('visibilita', 'Visibilità tornei esterni (es. Magman)', async (ctx) => {
    try {
      const { text, keyboard } = renderVisibilita(await fetchShowExternalTournaments(ctx.chat.id))
      await ctx.reply(text.text, { entities: text.entities, reply_markup: keyboard })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le impostazioni, riprova più tardi.')
    }
  })

  bot.callbackQuery('visibilita:toggle', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) {
      await ctx.answerCallbackQuery().catch(() => {})
      return
    }

    try {
      const next = !(await fetchShowExternalTournaments(chatId))
      await setShowExternalTournaments(chatId, next)

      const { text, keyboard } = renderVisibilita(next)
      await ctx.editMessageText(text.text, { entities: text.entities, reply_markup: keyboard })
      await ctx.answerCallbackQuery({ text: next ? 'Tornei esterni mostrati' : 'Tornei esterni nascosti' })
    } catch {
      await answerLoadError(ctx)
    }
  })
}
