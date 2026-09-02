// server\utils\telegram\commands\index.ts
import type { Bot } from 'grammy'
import { registerCoreCommands } from './core'
import { registerClassificheCommand } from './classifiche'
import { registerEventiCommand } from './eventi'
import { registerCalendarioCommand } from './calendario'
import { registerLegheCommand } from './leghe'
import { registerProssimoCommand } from './prossimo'
import { registerIscrizioniCommand } from './iscrizioni'
import { registerSupportoCommand } from './supporto'
import { registerCarteCercateCommand } from './cartecercate'
import { registerTesseraCommand } from './tessera'
import { registerMazziCommand } from './mazzi'
import { registerStubCommands } from './stubs'
import { registerLinkingHandler } from './linking'

// Single entry point for bot.ts — add a new command's register call here
// instead of growing bot.ts's own import list. registerLinkingHandler stays
// last: its bot.on('message:text') catch-all must only see messages no
// earlier /command handler already claimed. registerSupportoCommand also
// registers its own bot.on('message:text') (ForceReply-based, see
// supporto.ts) — must come before registerLinkingHandler for the same
// reason, though it isn't itself a plain catch-all.
export function registerCommands(bot: Bot) {
  registerCoreCommands(bot)
  registerClassificheCommand(bot)
  registerEventiCommand(bot)
  registerCalendarioCommand(bot)
  registerLegheCommand(bot)
  registerProssimoCommand(bot)
  registerIscrizioniCommand(bot)
  registerSupportoCommand(bot)
  registerCarteCercateCommand(bot)
  registerTesseraCommand(bot)
  registerMazziCommand(bot)
  registerStubCommands(bot)
  registerLinkingHandler(bot)
}
