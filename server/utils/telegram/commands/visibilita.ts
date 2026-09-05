// server\utils\telegram\commands\visibilita.ts
import { InlineKeyboard } from 'grammy'
import { fetchShowExternalTournaments, setShowExternalTournaments } from './tournament/queries'
import { answerLoadError } from './callbackErrors'
import type { Bot } from 'grammy'

// Public, chat-scoped (not tied to a linked associate — pauperwave_telegram_chat_settings
// keys on chat_id alone, see migration 20260904160000) toggle for whether
// /calendario includes shop-organized tournaments (Magman etc., status
// 'external'). Hidden by default per fetchShowExternalTournaments' own
// fallback — this command is the only way to turn them on.
function renderVisibilita(showExternal: boolean): { text: string, keyboard: InlineKeyboard } {
  const stateLine = showExternal
    ? '🏪 I tornei di negozi esterni (es. Magman) sono *visibili* in /calendario.'
    : '🏪 I tornei di negozi esterni (es. Magman) sono *nascosti* in /calendario.'

  const text = `👁️ *Visibilità tornei*\n\n${stateLine}`
  const keyboard = new InlineKeyboard().text(
    showExternal ? '🙈 Nascondi tornei esterni' : '👁️ Mostra tornei esterni',
    'visibilita:toggle'
  )

  return { text, keyboard }
}

export function registerVisibilitaCommand(bot: Bot) {
  bot.command('visibilita', async (ctx) => {
    try {
      const { text, keyboard } = renderVisibilita(await fetchShowExternalTournaments(ctx.chat.id))
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
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
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard })
      await ctx.answerCallbackQuery({ text: next ? 'Tornei esterni mostrati' : 'Tornei esterni nascosti' })
    } catch {
      await answerLoadError(ctx)
    }
  })
}
