// server\utils\telegram\commands\core.ts
import { it } from 'date-fns/locale'

import type { Bot, Context } from 'grammy'
import { GrammyError, InlineKeyboard } from 'grammy'
import type { InputRichMessage } from 'grammy/types'
import type { CommandGroup } from '@grammyjs/commands'
import { ICONS } from '../icons'
import { answerLoadError } from './callbackErrors'
import { resolveDeepLink } from '../deepLinks'

// Quick-launch buttons for the most-used commands, embedded as inline "buttons" blocks after their
// category (like calendario.ts's per-tournament button, not a Menu reply_markup). Handled by a
// plain bot.on('callback_query:data') (helpbtn: prefix) reusing each command's deep-link handler
// (deepLinks.ts).
const HELP_BTN_PREFIX = 'helpbtn:'

// Exported so other commands can send a button opening one of these deep links
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

// blocks, not markdown: a block's `text` is structured RichText, so "\n" is a literal line break,
// and no "- " list marker is needed (it broke Telegram's tap-to-run bot_command detection on
// "/command" mentions)
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
    },

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
    },

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

// Extracted for reuse by t.me/<bot>?start=help (deepLinks.ts)
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
      await handler(ctx)
      return
    }
    await ctx.replyWithRichMessage({ blocks: startBlocks() })
  })

  commands.command('help', 'Elenco comandi disponibili', helpCommandHandler)

  commands.command('status', 'Stato del bot', statusCommandHandler)

  // Not Menu-managed, so no registration-order dependency on bot.use(commands) (see statusKeyboard)
  bot.on('callback_query:data', handleStatusRefresh)
}
