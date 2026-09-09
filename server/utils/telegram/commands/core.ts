// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
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

// Quick-launch buttons for a few of the most-used commands, embedded as
// inline "buttons" blocks right after the category they belong to — same
// "buttons near their own content" pattern as calendario.ts's per-tournament
// button, not a Menu-managed reply_markup. Handled by a plain
// bot.on('callback_query:data', ...) below (helpbtn: prefix), reusing each
// command's own deep-link handler (deepLinks.ts) instead of a separate
// import per button.
const HELP_BTN_PREFIX = 'helpbtn:'

function encodeHelpBtn(payload: string): string {
  return `${HELP_BTN_PREFIX}${payload}`
}

// blocks, not markdown — a block's `text` is structured RichText, not
// parsed markdown, so a plain "\n" is a literal line break here (unlike
// markdown mode, where it's a soft break that gets collapsed — see
// git history on this file for that whole saga). No "- " list marker
// needed either, which is what broke Telegram's own tap-to-run bot_command
// detection on "/command" mentions in the previous markdown version
// (confirmed 2026-09-09).
function helpBlocks(): InputRichMessage['blocks'] {
  return [
    { type: 'heading', size: 3, text: 'Comandi disponibili' },

    { type: 'paragraph', text: { type: 'bold', text: '⚙️ Generale' } },
    {
      type: 'paragraph',
      text: '/start — avvia il bot\n/help — mostra questo messaggio\n/status — mostra lo stato corrente del bot'
    },

    { type: 'paragraph', text: { type: 'bold', text: '🏆 Classifiche' } },
    { type: 'paragraph', text: '/classifiche — classifiche per formato' },

    { type: 'paragraph', text: { type: 'bold', text: '🎲 Tornei e leghe' } },
    {
      type: 'paragraph',
      text: '/eventi — prossimi eventi\n/calendario — prossimi tornei\n/leghe — leghe attive\n/prossimo — il prossimo torneo'
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🎲 Apri Calendario', callback_data: encodeHelpBtn('calendario') },
        { text: '🏆 Apri Prossimo', callback_data: encodeHelpBtn('prossimo') }
      ]
    },

    { type: 'paragraph', text: { type: 'bold', text: '🎟️ Le mie iscrizioni' } },
    { type: 'paragraph', text: '/iscrizioni — i tornei a cui sei iscritto' },

    { type: 'paragraph', text: { type: 'bold', text: '🏟️ Durante un torneo' } },
    {
      type: 'paragraph',
      text: '🚧 /tavolo — tavolo, avversario del turno e comandante (in lavorazione, dati di esempio)\n'
        + '🚧 /risultato — posizione, uccisioni e voti di fine turno (in lavorazione, dati di esempio)'
    },

    { type: 'paragraph', text: { type: 'bold', text: '👤 Account' } },
    {
      type: 'paragraph',
      text: '/collegamento — verifica se questa chat è collegata a un socio\n'
        + '/scollegamento — scollega questa chat dal tuo profilo socio\n'
        + '/tessera — stato del tuo tesseramento'
    },
    { type: 'buttons', buttons: [{ text: '🪪 Apri Tessera', callback_data: encodeHelpBtn('tessera') }] },

    { type: 'paragraph', text: { type: 'bold', text: '💬 Supporto' } },
    { type: 'paragraph', text: '/supporto — inoltra un messaggio allo staff' }
  ]
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=help — see
// deepLinks.ts.
function helpCommandHandler(ctx: Context) {
  return ctx.replyWithRichMessage({ blocks: helpBlocks() })
}

registerDeepLink('help', helpCommandHandler)

async function handleHelpButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(HELP_BTN_PREFIX)) return next()

  const payload = data.slice(HELP_BTN_PREFIX.length)
  await resolveDeepLink(payload)?.(ctx)
  await ctx.answerCallbackQuery()
}

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

// Registered separately from registerCoreCommands, and called last of all
// (see commands/index.ts) — @grammyjs/menu installs each menu's own
// "permission to send this menu" via ctx.api.config.use(...) *inside its
// own middleware*, once per update (confirmed 2026-09-09 in
// @grammyjs/menu/out/menu.js:570). handleHelpButton never calls next(), so
// registering it before a later command's bot.use(itsMenu) would skip that
// menu's middleware entirely for this update, and reusing that command's
// deep-link handler here (which sends a message with that menu as
// reply_markup) would fail with "Cannot send menu 'x'! ... try to send it
// through bot.api?" — exactly what happened when this lived inside
// registerCoreCommands, called first.
export function registerHelpButtonHandler(bot: Bot) {
  bot.on('callback_query:data', handleHelpButton)
}

export function registerCoreCommands(bot: Bot, commands: CommandGroup<Context>) {
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
