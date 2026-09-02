// server\utils\telegram\bot.ts
import { Bot } from 'grammy'
import { registerClassificheCommand } from './commands/classifiche'
import { registerEventiCommand } from './commands/eventi'
import { registerTorneiCommand } from './commands/tornei'
import { registerLegheCommand } from './commands/leghe'
import { registerStubCommands } from './commands/stubs'

let bot: Bot | null = null

// Lazily instantiated singleton, reused for the Nitro process's lifetime —
// avoids re-registering command handlers on every webhook request.
export function useTelegramBot(): Bot {
  if (bot) return bot

  const token = useRuntimeConfig().telegramBotToken
  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TELEGRAM_BOT_TOKEN non configurato'
    })
  }

  bot = new Bot(token)

  bot.command('start', ctx => ctx.reply(
    'Ciao! Sono il bot di Pauperwave 👋\nUsa /help per vedere i comandi disponibili.'
  ))

  bot.command('help', ctx => ctx.reply(
    'Comandi disponibili:\n\n'
    + '/start — avvia il bot\n'
    + '/help — mostra questo messaggio\n'
    + '/status — mostra lo stato corrente del bot\n'
    + '/whoami — mostra l\'id di questa chat\n'
    + '/classifiche — classifiche per formato\n'
    + '/eventi — prossimi eventi\n'
    + '/tornei — prossimi tornei (bottoni mese/location)\n'
    + '/leghe — leghe attive\n\n'
    + 'In arrivo:\n'
    + '/cartecercate, /prossimo, '
    + '/tessera, /mieitornei, /mieimazzi, /notifiche'
  ))

  bot.command('status', ctx => ctx.reply('🟢 Bot operativo.'))

  // Dev/setup helper: lets an admin read off their numeric chat id (needed
  // for TELEGRAM_ADMIN_CHAT_ID) without grepping raw getUpdates output.
  bot.command('whoami', ctx => ctx.reply(`Chat id: ${ctx.chat.id}`))

  registerClassificheCommand(bot)
  registerEventiCommand(bot)
  registerTorneiCommand(bot)
  registerLegheCommand(bot)
  registerStubCommands(bot)

  return bot
}
