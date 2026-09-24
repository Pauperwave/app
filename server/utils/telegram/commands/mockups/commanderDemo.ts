// server\utils\telegram\commands\mockups\commanderDemo.ts
// Hidden demo of the old MOCKUP Commander flow (fake table, fake scoring
// formula) — kept only to show the shape of the position/kills/votes wizard
// risultato.ts implements, now that /tavolo and /risultato use the real
// DB-backed flow (tournaments/commanderReport.ts, 2026-09-24). Registered
// like dioporco.ts: bot.command(), not the shared CommandGroup, so it's
// reachable by typing the command or its deep link while staying out of the
// "/" picker and /help.
import type { Bot, Context } from 'grammy'
import { Menu } from '@grammyjs/menu'

import { openRisultato, risultatoMenu } from './risultato'
import { registerDeepLink } from '../../deepLinks'

const MOCK_TABLE = { number: 7, opponents: ['Marco Rossi', 'Giulia Bianchi', 'Luca Verdi'] }

function demoMarkdown(): string {
  const lines = MOCK_TABLE.opponents.map(name => `- ${name}`)
  return `## 🪑 Tavolo ${MOCK_TABLE.number} (demo)\n\nGiochi con:\n${lines.join('\n')}\n\n`
    + '_Dati di esempio — nessuna scrittura reale, vedi il tavolo vero con /tavolo._'
}

// autoAnswer/onMenuOutdated: false — same reasoning as risultatoMenu's own
// comment (dynamic content re-read live, the plugin's staleness heuristic
// would false-positive).
const demoMenu = new Menu<Context>('cmddemo', {
  autoAnswer: false,
  onMenuOutdated: false
}).submenu({ text: '✍️ Inserisci risultati (demo)', payload: '' }, 'ris', openRisultato)

async function commanderDemoCommandHandler(ctx: Context) {
  await ctx.replyWithRichMessage({ markdown: demoMarkdown() }, { reply_markup: demoMenu })
}

registerDeepLink('commander-demo', commanderDemoCommandHandler)

export function registerCommanderDemoCommand(bot: Bot) {
  demoMenu.register(risultatoMenu)
  bot.use(demoMenu)
  bot.command('commanderdemo', commanderDemoCommandHandler)
}
