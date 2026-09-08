// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { resolveDeepLink } from '../deepLinks'

const START_TEXT = 'Ciao! Sono il bot di Pauperwave 👋🏻\n\n'
  + 'Scrivimi la tua email da socio (quella con cui ti sei tesserato) per '
  + 'collegare il tuo account e sbloccare i comandi personalizzati:\n'
  + '/iscrizioni — i tornei a cui sei iscritto\n'
  + '/tessera — stato del tuo tesseramento\n\n'
  + 'Usa /collegamento per verificare se questa chat è già collegata a un socio.\n\n'
  + 'Oppure usa subito /help per vedere quelli pubblici, funzionano già senza.'

const HELP_TEXT = 'Comandi disponibili:\n\n'
  + '⚙️ Generale\n'
  + '/start — avvia il bot\n'
  + '/help — mostra questo messaggio\n'
  + '/status — mostra lo stato corrente del bot\n\n'
  + '🏆 Classifiche\n'
  + '/classifiche — classifiche per formato\n\n'
  + '🎲 Tornei e leghe\n'
  + '/eventi — prossimi eventi\n'
  + '/calendario — prossimi tornei\n'
  + '/leghe — leghe attive\n'
  + '/prossimo — il prossimo torneo\n\n'
  + '🎟️ Le mie iscrizioni\n'
  + '/iscrizioni — i tornei a cui sei iscritto\n\n'
  + '🏟️ Durante un torneo\n'
  + '🚧 /tavolo — tavolo, avversario del turno e comandante (in lavorazione, dati di esempio)\n'
  + '🚧 /risultato — posizione, uccisioni e voti di fine turno (in lavorazione, dati di esempio)\n\n'
  + '👤 Account\n'
  + '/collegamento — verifica se questa chat è collegata a un socio\n'
  + '/tessera — stato del tuo tesseramento\n\n'
  + '💬 Supporto\n'
  + '/supporto — inoltra un messaggio allo staff'

// Extracted so it can be reused verbatim by t.me/<bot>?start=help — see
// deepLinks.ts.
function helpCommandHandler(ctx: Context) {
  return ctx.reply(HELP_TEXT)
}

registerDeepLink('help', helpCommandHandler)

export function registerCoreCommands(commands: CommandGroup<Context>) {
  // Telegram delivers t.me/<bot>?start=<payload> as "/start <payload>" —
  // ctx.match is the payload itself. A recognized one (see deepLinks.ts,
  // populated by each register*Command that opts in) takes over from the
  // plain welcome text, landing the user directly on that view.
  commands.command('start', 'Avvia il bot', async (ctx) => {
    const handler = ctx.match ? resolveDeepLink(ctx.match) : undefined
    if (handler) {
      await handler(ctx)
      return
    }
    await ctx.reply(START_TEXT)
  })

  commands.command('help', 'Elenco comandi disponibili', helpCommandHandler)

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
