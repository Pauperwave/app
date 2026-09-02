// server\utils\telegram\commands\index.ts
import type { Bot } from 'grammy'
import { registerCoreCommands } from './core'
import { registerClassificheCommand } from './classifiche'
import { registerEventiCommand } from './eventi'
import { registerCalendarioCommand } from './calendario'
import { registerLegheCommand } from './leghe'
import { registerProssimoCommand } from './prossimo'
import { registerIscrizioniCommand } from './iscrizioni'
import { registerStubCommands } from './stubs'
import { registerLinkingHandler } from './linking'

// Single entry point for bot.ts — add a new command's register call here
// instead of growing bot.ts's own import list. registerLinkingHandler stays
// last: its bot.on('message:text') catch-all must only see messages no
// earlier /command handler already claimed.
export function registerCommands(bot: Bot) {
  registerCoreCommands(bot)
  registerClassificheCommand(bot)
  registerEventiCommand(bot)
  registerCalendarioCommand(bot)
  registerLegheCommand(bot)
  registerProssimoCommand(bot)
  registerIscrizioniCommand(bot)
  registerStubCommands(bot)
  registerLinkingHandler(bot)
}
