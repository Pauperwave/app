// server\utils\telegram\commands\core.ts
import type { Bot } from 'grammy'

const HELP_TEXT = 'Comandi disponibili:\n\n'
  + '/start — avvia il bot\n'
  + '/help — mostra questo messaggio\n'
  + '/status — mostra lo stato corrente del bot\n'
  + '/whoami — mostra l\'id di questa chat\n'
  + '/classifiche — classifiche per formato\n'
  + '/eventi — prossimi eventi\n'
  + '/calendario — prossimi tornei (bottoni mese)\n'
  + '/leghe — leghe attive\n'
  + '/prossimo — il prossimo torneo\n'
  + '/iscrizioni — i tornei a cui sei iscritto\n'
  + '/supporto — inoltra un messaggio allo staff\n'
  + '/cartecercate — carte cercate dai soci\n'
  + '/tessera — stato del tuo tesseramento\n'
  + '/mazzi — i tuoi mazzi Commander\n\n'
  + 'In arrivo:\n'
  + '/notifiche\n\n'
  + 'Bloccati (in attesa di una feature nell\'app):\n'
  + '/tavolo, /vota'

export function registerCoreCommands(bot: Bot) {
  bot.command('start', ctx => ctx.reply(
    'Ciao! Sono il bot di Pauperwave 👋\n\n'
    + 'Scrivimi la tua email da socio (quella con cui ti sei tesserato) per '
    + 'collegare il tuo account e sbloccare i comandi personalizzati — '
    + 'oppure usa subito /help per vedere quelli pubblici, funzionano già senza.'
  ))

  bot.command('help', ctx => ctx.reply(HELP_TEXT))

  bot.command('status', ctx => ctx.reply('🟢 Bot operativo.'))

  // Dev/setup helper: lets an admin read off their numeric chat id (needed
  // to populate pauperwave_associate_telegram_links by hand) without
  // grepping raw getUpdates output.
  bot.command('whoami', ctx => ctx.reply(`Chat id: ${ctx.chat.id}`))
}
