// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import { GrammyError, InlineKeyboard } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { ICONS } from '../icons'
import { answerLoadError } from './callbackErrors'
import { resolveDeepLink } from '../deepLinks'
import {
  HELP_TOPICS,
  decodeHelpTopicCallback,
  encodeHelpTopicCallback,
  helpTopicPayload,
  parseHelpTopic,
  type HelpTopic,
  type HelpView
} from '#shared/utils/telegram/helpTopics'

// Quick-launch buttons for the most-used commands, embedded as inline "buttons" blocks after their
// category (like calendario.ts's per-tournament button, not a Menu reply_markup). Handled by a
// plain bot.on('callback_query:data') (helpbtn: prefix) reusing each command's deep-link handler
// (deepLinks.ts).
const HELP_BTN_PREFIX = 'helpbtn:'

// Exported so other commands (dioporco.ts) can send a button opening one of these deep links
export function encodeHelpBtn(payload: string): string {
  return `${HELP_BTN_PREFIX}${payload}`
}

// blocks, not markdown (see helpBlocks), so its four mentioned commands can carry quick-launch
// buttons
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

type Blocks = NonNullable<InputRichMessage['blocks']>

// blocks, not markdown: a block's `text` is structured RichText, so "\n" is a literal line break,
// and no "- " list marker is needed (it broke Telegram's tap-to-run bot_command detection on
// "/command" mentions)
const HELP_SECTIONS: Record<HelpTopic, () => Blocks> = {
  generale: () => [
    { type: 'paragraph', text: { type: 'bold', text: '⚙️ Generale' } },
    {
      type: 'paragraph',
      text: '/start — avvia il bot\n/help — mostra questo messaggio\n/status — mostra lo stato corrente del bot'
    },
    { type: 'buttons', buttons: [{ text: '🟢 Status', callback_data: encodeHelpBtn('status') }] }
  ],

  classifiche: () => [
    { type: 'paragraph', text: { type: 'bold', text: `${ICONS.trophy} Classifiche` } },
    { type: 'paragraph', text: '/classifiche — classifiche per formato' },
    { type: 'buttons', buttons: [{ text: `${ICONS.trophy} Classifiche`, callback_data: encodeHelpBtn('classifiche') }] }
  ],

  tornei: () => [
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

    { type: 'paragraph', text: { type: 'bold', text: '🏟️ Durante un torneo' } },
    {
      type: 'paragraph',
      text: '/tavolo — il tuo tavolo, gli avversari del turno e il comandante; da qui inserisci il risultato\n'
        + '/drop — lascia il torneo Commander dopo aver inserito il risultato\n'
        + '/turni — contatore dei turni aggiuntivi a fine tempo'
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🪑 Tavolo', callback_data: encodeHelpBtn('tavolo') },
        { text: '🔢 Turni', callback_data: encodeHelpBtn('turni') }
      ]
    }
  ],

  iscrizioni: () => [
    { type: 'paragraph', text: { type: 'bold', text: `${ICONS.ticket} Le mie iscrizioni` } },
    { type: 'paragraph', text: '/iscrizioni — i tornei a cui sei iscritto' },
    { type: 'buttons', buttons: [{ text: `${ICONS.ticket} Iscrizioni`, callback_data: encodeHelpBtn('iscrizioni') }] }
  ],

  carte: () => [
    { type: 'paragraph', text: { type: 'bold', text: `${ICONS.card} Carte` } },
    {
      type: 'paragraph',
      text: '/prezzo [carta] — scegli la stampa e controlla il prezzo su CardMarket e CardTrader (filtri ITA/ENG e foil), anche in chat con @bot $ carta\n'
        + '/cercate — le carte che cerchi: vedi e togli (serve il collegamento)\n'
        + '/importa — incolla un elenco di carte da cercare, es. 1 Erode (SOS) 15 (serve il collegamento)'
    },
    {
      type: 'buttons',
      buttons: [
        { text: `${ICONS.card} Prezzo`, callback_data: encodeHelpBtn('prezzo') },
        { text: `${ICONS.wanted} Cercate`, callback_data: encodeHelpBtn('cercate') },
        { text: '📥 Importa', callback_data: encodeHelpBtn('importa') }
      ]
    }
  ],

  dadi: () => [
    { type: 'paragraph', text: { type: 'bold', text: '🎰 Dadi' } },
    {
      type: 'paragraph',
      text: '/dado — un dado a 6 facce (animato)\n/moneta — testa o croce\n/tira [facce] — un dado a N facce (default 20)'
    },
    {
      type: 'buttons',
      buttons: [
        { text: '🎲 Dado', callback_data: encodeHelpBtn('dado') },
        { text: '🪙 Moneta', callback_data: encodeHelpBtn('moneta') },
        { text: '🔢 Tira', callback_data: encodeHelpBtn('tira') }
      ]
    }
  ],

  account: () => [
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

const TOPIC_NAMES = HELP_TOPICS.join(', ')

const HELP_TOPIC_BUTTONS: Record<HelpTopic, string> = {
  generale: '⚙️ Generale',
  classifiche: `${ICONS.trophy} Classifiche`,
  tornei: '🎲 Tornei',
  iscrizioni: `${ICONS.ticket} Iscrizioni`,
  carte: `${ICONS.card} Carte`,
  dadi: '🎰 Dadi',
  account: '👤 Account'
}

const HELP_BUTTONS_PER_ROW = 3

// Plain InlineKeyboard, not a Menu: the whole state is in callback_data, so there is no
// registration-order dependency (see statusKeyboard). The shown view is marked, and "Tutto" brings
// the full message back.
function helpKeyboard(active: HelpView): InlineKeyboard {
  const buttons = [
    ...HELP_TOPICS.map(topic => ({ view: topic as HelpView, label: HELP_TOPIC_BUTTONS[topic] })),
    { view: 'all' as HelpView, label: '📖 Tutto' }
  ]

  const keyboard = new InlineKeyboard()
  buttons.forEach(({ view, label }, index) => {
    keyboard.text(view === active ? `• ${label}` : label, encodeHelpTopicCallback(view))
    if ((index + 1) % HELP_BUTTONS_PER_ROW === 0) keyboard.row()
  })
  return keyboard
}

function helpBlocks(view: HelpView): Blocks {
  if (view !== 'all') return HELP_SECTIONS[view]()

  return [
    { type: 'heading', size: 3, text: 'Comandi disponibili' },
    ...HELP_TOPICS.flatMap(topic => HELP_SECTIONS[topic]()),
    {
      type: 'paragraph',
      text: `Per una sola sezione usa i bottoni qui sotto, oppure /help <argomento>: ${TOPIC_NAMES}.`
    }
  ]
}

function replyWithHelp(ctx: Context, view: HelpView) {
  return ctx.replyWithRichMessage(
    { blocks: helpBlocks(view) },
    { reply_markup: helpKeyboard(view) }
  )
}

// /help [argomento]: no argument shows everything, a topic only its section
function helpCommandHandler(ctx: Context) {
  const argument = typeof ctx.match === 'string' ? ctx.match.trim() : ''
  if (!argument) return replyWithHelp(ctx, 'all')

  const topic = parseHelpTopic(argument)
  if (!topic) {
    return ctx.reply(`Non conosco l'argomento «${argument}». Prova con: ${TOPIC_NAMES}.`, {
      reply_markup: helpKeyboard('all')
    })
  }
  return replyWithHelp(ctx, topic)
}

// The bottom buttons swap the message's content in place; like the status refresh, an edit that
// changes nothing (the shown view tapped again) is not a failure
async function handleHelpTopic(ctx: Context, next: () => Promise<void>) {
  const view = decodeHelpTopicCallback(ctx.callbackQuery?.data ?? '')
  if (!view) return next()

  try {
    await ctx.editMessageText({ blocks: helpBlocks(view) }, { reply_markup: helpKeyboard(view) })
    await ctx.answerCallbackQuery()
  } catch (err) {
    if (err instanceof GrammyError && err.description.includes('message is not modified')) {
      await ctx.answerCallbackQuery()
      return
    }
    await answerLoadError(ctx)
  }
}

// Extracted for reuse by t.me/<bot>?start=help (deepLinks.ts), where ctx.match is already cleared
registerDeepLink('help', helpCommandHandler)

// One deep link per topic, for the /telegram-bot page's per-card buttons
for (const topic of HELP_TOPICS) {
  registerDeepLink(helpTopicPayload(topic), ctx => replyWithHelp(ctx, topic))
}

async function handleHelpButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data
  if (!data?.startsWith(HELP_BTN_PREFIX)) return next()

  const payload = data.slice(HELP_BTN_PREFIX.length)
  await resolveDeepLink(payload)?.(ctx)
  await ctx.answerCallbackQuery()
}

// Same wording as the dashboard's VersionBadge ("Aggiornato 14 ore fa")
const UPDATED_UNIT_LABELS = {
  minutes: ['minuto', 'minuti'],
  hours: ['ora', 'ore'],
  days: ['giorno', 'giorni'],
  months: ['mese', 'mesi'],
  years: ['anno', 'anni']
} as const

function updatedLabel(isoDate: string): string | null {
  const since = timeSince(isoDate)
  if (!since) return null
  if (since.unit === 'now') return 'Aggiornato adesso'

  const [singular, plural] = UPDATED_UNIT_LABELS[since.unit]
  return `Aggiornato ${since.count} ${since.count === 1 ? singular : plural} fa`
}

// Reads useRuntimeConfig().public on every call, not cached at module scope: a new deployment is a
// new cold Nitro instance, so the refresh button can surface a newer gitCommitSha once traffic
// rolls over
function statusText(): string {
  const { gitCommitSha, gitCommitDate } = useRuntimeConfig().public
  const lines = ['🟢 Bot operativo.']

  if (gitCommitSha) {
    lines.push(`🏷️ ${gitCommitSha.slice(0, 7)}`)
    if (gitCommitDate) {
      lines.push(`${ICONS.date} ${formatTelegramDate(gitCommitDate, 'd MMMM yyyy \'alle\' HH:mm', { locale: it })}`)

      const updated = updatedLabel(gitCommitDate)
      if (updated) lines.push(updated)
    }
  }

  // \n\n, not \n: in Rich Message markdown mode a single \n is a soft break (collapsed)
  return lines.join('\n\n')
}

const STATUS_REFRESH_DATA = 'statusrefresh'

// Plain grammy InlineKeyboard, not @grammyjs/menu: one static refresh button needs no
// submenu/dynamic features and avoids the registration-order gotcha (see registerHelpButtonHandler)
function statusKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🔄 Aggiorna', STATUS_REFRESH_DATA)
}

// Extracted for reuse by t.me/<bot>?start=status (deepLinks.ts)
function statusCommandHandler(ctx: Context) {
  return ctx.replyWithRichMessage({ markdown: statusText() }, { reply_markup: statusKeyboard() })
}

registerDeepLink('status', statusCommandHandler)

// "message is not modified" is Telegram's error for an edit with identical content: the expected
// outcome of most taps (no new deployment yet), so it gets a quiet answer instead of
// answerLoadError's alert
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

// Registered separately and called last (see commands/index.ts): each Menu installs its "permission
// to send this menu" inside its own middleware, once per update. handleHelpButton never calls
// next(), so registering it before another command's bot.use(itsMenu) would skip that menu for this
// update, and reusing its deep-link handler would fail with "Cannot send menu 'x'!".
export function registerHelpButtonHandler(bot: Bot) {
  bot.on('callback_query:data', handleHelpButton)
}

export function registerCoreCommands(bot: Bot, commands: CommandGroup<Context>) {
  // t.me/<bot>?start=<payload> arrives as "/start <payload>" (ctx.match is the payload): a
  // recognized one (deepLinks.ts) replaces the welcome text and lands the user on that view
  commands.command('start', 'Avvia il bot', async (ctx) => {
    const handler = ctx.match ? resolveDeepLink(ctx.match) : undefined
    if (handler) {
      // The payload only names the command: handlers read ctx.match as their own argument
      // (/tira's faces, /calendario's month), so it must look like the bare command
      ctx.match = ''
      await handler(ctx)
      return
    }
    await ctx.replyWithRichMessage({ blocks: startBlocks() })
  })

  commands.command('help', 'Elenco comandi disponibili', helpCommandHandler)

  commands.command('status', 'Stato del bot', statusCommandHandler)

  // Not Menu-managed, so no registration-order dependency on bot.use(commands) (see statusKeyboard)
  bot.on('callback_query:data', handleStatusRefresh)
  bot.on('callback_query:data', handleHelpTopic)
}
