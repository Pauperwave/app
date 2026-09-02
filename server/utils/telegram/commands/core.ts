// server\utils\telegram\commands\core.ts
import type { Bot } from 'grammy'

const HELP_TEXT = 'Comandi disponibili:\n\n'
  + '/start — avvia il bot\n'
  + '/help — mostra questo messaggio\n'
  + '/status — mostra lo stato corrente del bot\n'
  + '/whoami — mostra l\'id di questa chat\n'
  + '/classifiche — classifiche per formato\n'
  + '/eventi — prossimi eventi\n'
  + '/tornei — prossimi tornei (bottoni mese/location)\n'
  + '/leghe — leghe attive\n'
  + '/prossimo — il prossimo torneo\n\n'
  + 'In arrivo:\n'
  + '/cartecercate, /tessera, /mieitornei, /mieimazzi, /notifiche'

export function registerCoreCommands(bot: Bot) {
  bot.command('start', ctx => ctx.reply(
    'Ciao! Sono il bot di Pauperwave 👋\nUsa /help per vedere i comandi disponibili.'
  ))

  bot.command('help', ctx => ctx.reply(HELP_TEXT))

  bot.command('status', ctx => ctx.reply('🟢 Bot operativo.'))

  // Dev/setup helper: lets an admin read off their numeric chat id (needed
  // to populate pauperwave_associate_telegram_links by hand) without
  // grepping raw getUpdates output.
  bot.command('whoami', ctx => ctx.reply(`Chat id: ${ctx.chat.id}`))
}
