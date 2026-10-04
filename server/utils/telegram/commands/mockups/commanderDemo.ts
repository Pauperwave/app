// server\utils\telegram\commands\mockups\commanderDemo.ts
// Hidden demo of the old MOCKUP Commander flow (fake table and scoring), kept to show the
// position/kills/votes wizard that risultato.ts implements, now that /tavolo uses the real flow
// (commanderReport.ts). Registered with bot.command(), not the
// CommandGroup): reachable by command or deep link, absent from the "/" picker and /help.
import type { Bot, Context } from 'grammy'
import { Menu } from '@grammyjs/menu'

import { openRisultato, risultatoMenu } from './risultato'
import { registerDeepLink } from '../../deepLinks'
import { ICONS } from '~~/server/utils/telegram/icons'

const MOCK_TABLE = { number: 7, opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi'] }

function demoMarkdown(): string {
  const lines = MOCK_TABLE.opponents.map(name => `- ${name}`)
  return `## ${ICONS.table} Tavolo ${MOCK_TABLE.number} (demo)\n\nGiochi con:\n${lines.join('\n')}\n\n`
    + '_Dati di esempio — nessuna scrittura reale, vedi il tavolo vero con /tavolo._'
}

// autoAnswer/onMenuOutdated: false, like risultatoMenu: dynamic content is re-read live, so the
// staleness heuristic would false-positive
const demoMenu = new Menu<Context>('cmddemo', {
  autoAnswer: false,
  onMenuOutdated: false
}).submenu({ text: `${ICONS.write} Inserisci risultati (demo)`, payload: '' }, 'ris', openRisultato)

async function commanderDemoCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage({ markdown: demoMarkdown() }, { reply_markup: demoMenu })
}

registerDeepLink('commander-demo', commanderDemoCommandHandler)

export function registerCommanderDemoCommand(bot: Bot) {
  demoMenu.register(risultatoMenu)
  bot.use(demoMenu)
  bot.command('commanderdemo', commanderDemoCommandHandler)
}
