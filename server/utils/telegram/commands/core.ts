// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import { GrammyError, InlineKeyboard } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { ICONS } from '../icons'
import { answerLoadError } from './callbackErrors'
import { resolveDeepLink } from '../deepLinks'

// Quick-launch buttons for a few of the most-used commands, embedded as
// inline "buttons" blocks right after the category they belong to — same
// "buttons near their own content" pattern as calendario.ts's per-tournament
// button, not a Menu-managed reply_markup. Handled by a plain
// bot.on('callback_query:data', ...) below (helpbtn: prefix), reusing each
// command's own deep-link handler (deepLinks.ts) instead of a separate
// import per button.
const HELP_BTN_PREFIX = 'helpbtn:'

// Exported so other commands (dioporco.ts) can send a button that opens
// one of these deep links too, without duplicating the whole
// prefix/handler mechanism below.
export function encodeHelpBtn(payload: string): string {
  return `${HELP_BTN_PREFIX}${payload}`
}

// blocks, not markdown — same reasoning as helpBlocks()'s own comment
// below, plus it lets the four commands mentioned here (iscrizioni,
// tessera, collegamento, help) carry their own quick-launch buttons.
function startBlocks(): InputRichMessage['blocks'] {
  return [
    { type: 'paragraph', text: 'Ciao! Sono il bot di Pauperwave 👋🏻' },
    {
      type: 'paragraph',
      text: 'Scrivimi la tua email da socio (quella con cui ti sei tesserato) per collegare il tuo account '
        + 'e sbloccare i comandi personalizzati:'
    },
    {
      type: 'paragraph',
      text: '/iscrizioni — i tornei a cui sei iscritto\n/tessera — stato del tuo tesseramento'
    },
    {
      type: 'buttons',
      buttons: [
        { text: `${ICONS.ticket} Iscrizioni`, callback_data: encodeHelpBtn('iscrizioni') },
        { text: `${ICONS.membershipCard} Tessera`, callback_data: encodeHelpBtn('tessera') }
      ]
    },
    { type: 'paragraph', text: 'Usa /collegamento per verificare se questa chat è già collegata a un socio.' },
    { type: 'buttons', buttons: [{ text: '🔗 Collegamento', callback_data: encodeHelpBtn('collegamento') }] },
    { type: 'paragraph', text: 'Oppure usa subito /help per vedere quelli pubblici, funzionano già senza.' },
    { type: 'buttons', buttons: [{ text: '📖 Help', callback_data: encodeHelpBtn('help') }] }
  ]
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
    { type: 'buttons', buttons: [{ text: '🟢 Status', callback_data: encodeHelpBtn('status') }] },

    { type: 'paragraph', text: { type: 'bold', text: `${ICONS.trophy} Classifiche` } },
    { type: 'paragraph', text: '/classifiche — classifiche per formato' },
    { type: 'buttons', buttons: [{ text: `${ICONS.trophy} Classifiche`, callback_data: encodeHelpBtn('classifiche') }] },

    { type: 'paragraph', text: { type: 'bold', text: '🎲 Tornei e leghe' } },
    {
      type: 'paragraph',
      text: '/eventi — prossimi eventi\n/calendario — prossimi tornei\n/leghe — leghe attive\n/prossimo — il prossimo torneo'
    },
    {
      type: 'buttons',
      buttons: [
        { text: `${ICONS.calendar} Calendario`, callback_data: encodeHelpBtn('calendario') },
        { text: `${ICONS.trophy} Leghe`, callback_data: encodeHelpBtn('leghe') },
        { text: '⏭️ Prossimo', callback_data: encodeHelpBtn('prossimo') }
      ]
    },

    { type: 'paragraph', text: { type: 'bold', text: `${ICONS.ticket} Le mie iscrizioni` } },
    { type: 'paragraph', text: '/iscrizioni — i tornei a cui sei iscritto' },
    { type: 'buttons', buttons: [{ text: `${ICONS.ticket} Iscrizioni`, callback_data: encodeHelpBtn('iscrizioni') }] },

    { type: 'paragraph', text: { type: 'bold', text: '🏟️ Durante un torneo' } },
    {
      type: 'paragraph',
      text: '🚧 /tavolo — tavolo, avversario del turno e comandante (Commander, in lavorazione, dati di esempio)\n'
        + '🚧 /risultato — posizione, uccisioni e voti di fine turno (Commander, in lavorazione, dati di esempio)\n'
        + '/dado — un dado a 6 facce (animato)\n/moneta — testa o croce\n/tira [facce] — un dado a N facce (default 20)'
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🪑 Tavolo', callback_data: encodeHelpBtn('tavolo') },
        { text: '🏅 Risultato', callback_data: encodeHelpBtn('risultato') }
      ]
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🎲 Dado', callback_data: encodeHelpBtn('dado') },
        { text: '🪙 Moneta', callback_data: encodeHelpBtn('moneta') },
        { text: '🔢 Tira', callback_data: encodeHelpBtn('tira') }
      ]
    },

    { type: 'paragraph', text: { type: 'bold', text: '👤 Account' } },
    {
      type: 'paragraph',
      text: '/collegamento — verifica se questa chat è collegata a un socio\n'
        + '/scollegamento — scollega questa chat dal tuo profilo socio\n'
        + '/tessera — stato del tuo tesseramento'
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🔗 Collegamento', callback_data: encodeHelpBtn('collegamento') },
        { text: '🔓 Scollegamento', callback_data: encodeHelpBtn('scollegamento') },
        { text: `${ICONS.membershipCard} Tessera`, callback_data: encodeHelpBtn('tessera') }
      ]
    },

    { type: 'paragraph', text: { type: 'bold', text: '💬 Supporto' } },
    { type: 'paragraph', text: '/supporto — inoltra un messaggio allo staff' },
    { type: 'buttons', buttons: [{ text: '💬 Supporto', callback_data: encodeHelpBtn('supporto') }] }
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

// Reads useRuntimeConfig().public fresh on every call (not cached at
// module scope) — that's the whole point of the refresh button below: a
// new deployment means a new cold Nitro instance with its own build-time
// config, so re-reading it can actually surface a newer gitCommitSha
// once Vercel has rolled traffic over to it.
function statusText(): string {
  const { gitCommitSha, gitCommitDate } = useRuntimeConfig().public
  const lines = ['🟢 Bot operativo.']

  if (gitCommitSha) {
    lines.push(`🏷️ ${gitCommitSha.slice(0, 7)}`)
    if (gitCommitDate) {
      lines.push(`${ICONS.date} ${formatTelegramDate(gitCommitDate, 'd MMMM yyyy \'alle\' HH:mm', { locale: it })}`)
    }
  }

  // \n\n, not \n — in Rich Message markdown mode a single \n is a soft
  // break (collapsed, like standard Markdown), not a real line break.
  return lines.join('\n\n')
}

const STATUS_REFRESH_DATA = 'statusrefresh'

// Plain grammy InlineKeyboard, not @grammyjs/menu — a single static
// refresh button doesn't need submenu/dynamic-range features, and skips
// the whole "must be reachable via bot.use()/.register() for this exact
// update" registration-order class of gotcha documented elsewhere in this
// file (see registerHelpButtonHandler's own comment).
function statusKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🔄 Aggiorna', STATUS_REFRESH_DATA)
}

// Extracted so it can be reused verbatim by t.me/<bot>?start=status — see
// deepLinks.ts.
function statusCommandHandler(ctx: Context) {
  return ctx.replyWithRichMessage({ markdown: statusText() }, { reply_markup: statusKeyboard() })
}

registerDeepLink('status', statusCommandHandler)

// "Bad Request: message is not modified" is Telegram's own error for an
// edit whose content is byte-identical to what's already there — the
// expected outcome of most taps here (no new deployment yet), not a real
// failure, so it gets its own quiet answer instead of answerLoadError's
// alert.
async function handleStatusRefresh(ctx: Context, next: () => Promise<void>) {
  if (ctx.callbackQuery?.data !== STATUS_REFRESH_DATA) return next()

  try {
    await ctx.editMessageText({ markdown: statusText() }, { reply_markup: statusKeyboard() })
    await ctx.answerCallbackQuery({ text: '✅ Aggiornato.' })
  } catch (err) {
    if (err instanceof GrammyError && err.description.includes('message is not modified')) {
      await ctx.answerCallbackQuery({ text: 'Nessuna versione più recente disponibile.' })
      return
    }
    await answerLoadError(ctx)
  }
}

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
    await ctx.replyWithRichMessage({ blocks: startBlocks() })
  })

  commands.command('help', 'Elenco comandi disponibili', helpCommandHandler)

  commands.command('status', 'Stato del bot', statusCommandHandler)

  // Not Menu-managed, so no registration-order dependency on bot.use(commands)
  // — see statusKeyboard's own comment on why a plain InlineKeyboard was used.
  bot.on('callback_query:data', handleStatusRefresh)
}
