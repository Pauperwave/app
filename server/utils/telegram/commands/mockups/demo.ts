// server\utils\telegram\commands\mockups\demo.ts
// Hidden /demo: tries the result entry of both formats with example data, nothing real is read or
// written. Commander is the old mockup wizard of risultato.ts, Pauper (1v1) the steps of
// matchReport.ts (demoPauper.ts). Registered with bot.command(), not the CommandGroup: reachable by
// command or deep link, absent from the "/" picker and /help.
import type { Bot, Context } from 'grammy'
import { Menu } from '@grammyjs/menu'

import { openRisultato, risultatoMenu } from './risultato'
import { showRichStep } from './richStepHelpers'
import {
  DEMO_PAUPER_PREFIX,
  decodeDemoPauperCallback,
  demoPauperStepMessage,
  demoPauperTableMessage
} from './demoPauper'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

const DEMO_COMMANDER_CALLBACK = 'demo:commander'
const DEMO_PAUPER_CALLBACK = 'demo:pauper'

const MOCK_TABLE = { number: 7, opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi'] }

function commanderDemoMarkdown(): string {
  const lines = MOCK_TABLE.opponents.map(name => `- ${name}`)
  return `## ${ICONS.table} Tavolo ${MOCK_TABLE.number} (demo)\n\nGiochi con:\n${lines.join('\n')}\n\n`
    + '_Dati di esempio — nessuna scrittura reale, vedi il tavolo vero con /tavolo._'
}

// autoAnswer/onMenuOutdated: false, like risultatoMenu: dynamic content is re-read live, so the
// staleness heuristic would false-positive
const commanderDemoMenu = new Menu<Context>('cmddemo', {
  autoAnswer: false,
  onMenuOutdated: false
}).submenu({ text: `${ICONS.write} Inserisci risultati (demo)`, payload: '' }, 'ris', openRisultato)

async function demoCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage({
    blocks: [
      { type: 'heading', size: 3, text: `${ICONS.settings} Demo dell'inserimento risultati` },
      { type: 'paragraph', text: 'Scegli il formato da provare, con dati di esempio: non viene scritto niente.' },
      {
        type: 'buttons',
        buttons: [
          { text: `${ICONS.commander} Commander`, callback_data: DEMO_COMMANDER_CALLBACK },
          { text: `${ICONS.pauper} Pauper`, callback_data: DEMO_PAUPER_CALLBACK }
        ]
      }
    ]
  })
}

registerDeepLink('demo', demoCommandHandler)

// A plain callback handler for the format choice and the Pauper steps, registered after the
// Commander menu's bot.use() (see registerDemoCommand): the Commander branch replies with that menu
async function handleDemoButton(ctx: Context, next: () => Promise<void>) {
  const data = ctx.callbackQuery?.data ?? ''

  if (data === DEMO_COMMANDER_CALLBACK) {
    await ctx.replyWithRichMessage(
      { markdown: commanderDemoMarkdown() },
      { reply_markup: commanderDemoMenu }
    )
    await ctx.answerCallbackQuery()
    return
  }

  if (data === DEMO_PAUPER_CALLBACK) {
    await ctx.replyWithRichMessage(demoPauperTableMessage())
    await ctx.answerCallbackQuery()
    return
  }

  if (!data.startsWith(DEMO_PAUPER_PREFIX)) return next()

  const callback = decodeDemoPauperCallback(data)
  if (!callback) {
    await ctx.answerCallbackQuery()
    return
  }
  await showRichStep(ctx, demoPauperStepMessage(callback))
}

export function registerDemoCommand(bot: Bot) {
  commanderDemoMenu.register(risultatoMenu)
  bot.use(commanderDemoMenu)
  bot.on('callback_query:data', handleDemoButton)
  bot.command('demo', demoCommandHandler)
}
