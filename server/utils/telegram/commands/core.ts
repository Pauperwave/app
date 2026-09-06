// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

const START_TEXT = 'Ciao! Sono il bot di Pauperwave 👋\n\n'
  + 'Scrivimi la tua email da socio (quella con cui ti sei tesserato) per '
  + 'collegare il tuo account e sbloccare i comandi personalizzati:\n'
  + '/iscrizioni — i tornei a cui sei iscritto\n'
  + '/tessera — stato del tuo tesseramento\n\n'
  + 'Oppure usa subito /help per vedere quelli pubblici, funzionano già senza.'

const HELP_TEXT = 'Comandi disponibili:\n\n'
  + '⚙️ Generale\n'
  + '/start — avvia il bot\n'
  + '/help — mostra questo messaggio\n'
  + '/status — mostra lo stato corrente del bot\n\n'
  + '🎲 Tornei e leghe\n'
  + '/classifiche — classifiche per formato\n'
  + '/eventi — prossimi eventi\n'
  + '/calendario — prossimi tornei (bottoni mese)\n'
  + '/leghe — leghe attive\n'
  + '/prossimo — il prossimo torneo\n'
  + '/iscrizioni — i tornei a cui sei iscritto\n'
  + '/tavolo — tavolo e avversario del turno\n'
  + '/vota — vota miglior mazzo/miglior giocata\n\n'
  + '👤 Account\n'
  + '/collegamento — verifica se questa chat è collegata a un socio\n'
  + '/tessera — stato del tuo tesseramento\n\n'
  + '💬 Supporto\n'
  + '/supporto — inoltra un messaggio allo staff'

export function registerCoreCommands(commands: CommandGroup<Context>) {
  commands.command('start', 'Avvia il bot', ctx => ctx.reply(START_TEXT))

  commands.command('help', 'Elenco comandi disponibili', ctx => ctx.reply(HELP_TEXT))

  commands.command('status', 'Stato del bot', (ctx) => {
    const { gitCommitSha, gitCommitDate } = useRuntimeConfig().public
    const lines = ['🟢 Bot operativo.']

    if (gitCommitSha) {
      lines.push('', `🏷️ ${gitCommitSha.slice(0, 7)}`)
      if (gitCommitDate) {
        lines.push(`🗓️ ${formatTelegramDate(gitCommitDate, 'd MMMM yyyy \'alle\' HH:mm', { locale: it })}`)
      }
    }

    return ctx.reply(lines.join('\n'))
  })
}
