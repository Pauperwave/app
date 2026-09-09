// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'
import { Menu } from '@grammyjs/menu'
import { resolveDeepLink } from '../deepLinks'

// Rich Message markdown, not plain text — a single \n is a soft break
// there (collapsed/ignored like standard Markdown), not a real line break
// like it is in ctx.reply's plain-text mode. Every list line below needs
// "- " (an actual markdown list item) to render on its own line; a bare
// "\n"-joined line list would run together into one paragraph. Confirmed
// 2026-09-09 — HELP_TEXT rendered as a single unbroken run of text in
// production before this fix.
const START_TEXT = 'Ciao! Sono il bot di Pauperwave 👋🏻\n\n'
  + 'Scrivimi la tua email da socio (quella con cui ti sei tesserato) per '
  + 'collegare il tuo account e sbloccare i comandi personalizzati:\n\n'
  + '- /iscrizioni — i tornei a cui sei iscritto\n'
  + '- /tessera — stato del tuo tesseramento\n\n'
  + 'Usa /collegamento per verificare se questa chat è già collegata a un socio.\n\n'
  + 'Oppure usa subito /help per vedere quelli pubblici, funzionano già senza.'

const HELP_TEXT = 'Comandi disponibili:\n\n'
  + '**⚙️ Generale**\n\n'
  + '- /start — avvia il bot\n'
  + '- /help — mostra questo messaggio\n'
  + '- /status — mostra lo stato corrente del bot\n\n'
  + '**🏆 Classifiche**\n\n'
  + '- /classifiche — classifiche per formato\n\n'
  + '**🎲 Tornei e leghe**\n\n'
  + '- /eventi — prossimi eventi\n'
  + '- /calendario — prossimi tornei\n'
  + '- /leghe — leghe attive\n'
  + '- /prossimo — il prossimo torneo\n\n'
  + '**🎟️ Le mie iscrizioni**\n\n'
  + '- /iscrizioni — i tornei a cui sei iscritto\n\n'
  + '**🏟️ Durante un torneo**\n\n'
  + '- 🚧 /tavolo — tavolo, avversario del turno e comandante (in lavorazione, dati di esempio)\n'
  + '- 🚧 /risultato — posizione, uccisioni e voti di fine turno (in lavorazione, dati di esempio)\n\n'
  + '**👤 Account**\n\n'
  + '- /collegamento — verifica se questa chat è collegata a un socio\n'
  + '- /scollegamento — scollega questa chat dal tuo profilo socio\n'
  + '- /tessera — stato del tuo tesseramento\n\n'
  + '**💬 Supporto**\n\n'
  + '- /supporto — inoltra un messaggio allo staff'

// Shortcuts to a few of the most-used commands, so /help doubles as a
// launcher instead of just a list to read and retype from. Reuses each
// command's own deep-link handler (deepLinks.ts) instead of importing it
// directly — same reasoning as the /start payload dispatch just below:
// one registry, no per-button wiring to keep in sync. Static content, no
// autoAnswer: false/onMenuOutdated: false override needed — Menu's default
// auto-ack is exactly what a "just run the command" button needs.
const helpMenu = new Menu<Context>('help')
  .text('🎲 /calendario', ctx => resolveDeepLink('calendario')?.(ctx))
  .row()
  .text('🏆 /prossimo', ctx => resolveDeepLink('prossimo')?.(ctx))
  .row()
  .text('🪪 /tessera', ctx => resolveDeepLink('tessera')?.(ctx))

// Extracted so it can be reused verbatim by t.me/<bot>?start=help — see
// deepLinks.ts.
function helpCommandHandler(ctx: Context) {
  return ctx.replyWithRichMessage({ markdown: HELP_TEXT }, { reply_markup: helpMenu })
}

registerDeepLink('help', helpCommandHandler)

// Extracted so it can be reused verbatim by t.me/<bot>?start=status — see
// deepLinks.ts.
function statusCommandHandler(ctx: Context) {
  const { gitCommitSha, gitCommitDate } = useRuntimeConfig().public
  const lines = ['🟢 Bot operativo.']

  if (gitCommitSha) {
    lines.push(`🏷️ ${gitCommitSha.slice(0, 7)}`)
    if (gitCommitDate) {
      lines.push(`🗓️ ${formatTelegramDate(gitCommitDate, 'd MMMM yyyy \'alle\' HH:mm', { locale: it })}`)
    }
  }

  // \n\n, not \n — see HELP_TEXT's own comment on why a single newline
  // doesn't produce a line break in Rich Message markdown.
  return ctx.replyWithRichMessage({ markdown: lines.join('\n\n') })
}

registerDeepLink('status', statusCommandHandler)

export function registerCoreCommands(bot: Bot, commands: CommandGroup<Context>) {
  bot.use(helpMenu)

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
    await ctx.replyWithRichMessage({ markdown: START_TEXT })
  })

  commands.command('help', 'Elenco comandi disponibili', helpCommandHandler)

  commands.command('status', 'Stato del bot', statusCommandHandler)
}
