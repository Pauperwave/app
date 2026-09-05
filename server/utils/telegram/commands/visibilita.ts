// server\utils\telegram\commands\visibilita.ts
import { Menu } from '@grammyjs/menu'
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
function visibilitaText(showExternal: boolean): FormattedString {
  const state = FormattedString.b(showExternal ? 'visibili' : 'nascosti')
  return fmt`👁️ ${FormattedString.b('Visibilità tornei')}\n\n🏪 I tornei di negozi esterni (es. Magman) sono ${state} in /calendario.`
}

// autoAnswer: false — the toggle handler answers with a custom confirmation
// text itself (Menu's default autoAnswer forks a plain answerCallbackQuery()
// concurrently, which would race with that and throw "query already
// answered").
const visibilitaMenu = new Menu<Context>('visibilita-menu', { autoAnswer: false }).dynamic(async (ctx, range) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const showExternal = await fetchShowExternalTournaments(chatId)
  range.text(
    showExternal ? '🙈 Nascondi tornei esterni' : '👁️ Mostra tornei esterni',
    async (ctx) => {
      try {
        const next = !showExternal
        await setShowExternalTournaments(chatId, next)

        const text = visibilitaText(next)
        await ctx.editMessageText(text.text, {
          entities: text.entities,
          reply_markup: visibilitaMenu
        })
        await ctx.answerCallbackQuery({ text: next ? 'Tornei esterni mostrati' : 'Tornei esterni nascosti' })
      } catch {
        await answerLoadError(ctx)
      }
    }
  )
})

export function registerVisibilitaCommand(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(visibilitaMenu)

  commands.command('visibilita', 'Visibilità tornei esterni (es. Magman)', async (ctx) => {
    try {
      const text = visibilitaText(await fetchShowExternalTournaments(ctx.chat.id))
      await ctx.reply(text.text, { entities: text.entities, reply_markup: visibilitaMenu })
    } catch {
      await ctx.reply('⚠️ Non sono riuscito a recuperare le impostazioni, riprova più tardi.')
    }
  })
}
