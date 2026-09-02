// server\utils\telegram\commands\index.ts
import type { Bot } from 'grammy'
import { registerCoreCommands } from './core'
import { registerClassificheCommand } from './classifiche'
import { registerEventiCommand } from './eventi'
import { registerTorneiCommand } from './tornei'
import { registerLegheCommand } from './leghe'
import { registerProssimoCommand } from './prossimo'
import { registerStubCommands } from './stubs'

// Single entry point for bot.ts — add a new command's register call here
// instead of growing bot.ts's own import list.
export function registerCommands(bot: Bot) {
  registerCoreCommands(bot)
  registerClassificheCommand(bot)
  registerEventiCommand(bot)
  registerTorneiCommand(bot)
  registerLegheCommand(bot)
  registerProssimoCommand(bot)
  registerStubCommands(bot)
}
