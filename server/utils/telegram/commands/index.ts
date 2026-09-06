// server\utils\telegram\commands\index.ts
import type { Bot, Context } from 'grammy'
import { CommandGroup } from '@grammyjs/commands'

import { registerCoreCommands } from './core'
import { registerClassificheCommand } from './classifiche'
import { registerEventiCommand } from './eventi'
import { registerCalendarioCommand } from './calendario'
import { registerLegheCommand } from './leghe'
import { registerProssimoCommand } from './prossimo'
import { registerIscrizioniCommand } from './iscrizioni'
import { registerSupportoCommand } from './supporto'
import { registerTesseraCommand } from './tessera'
import { registerCollegamentoCommand } from './collegamento'
import { registerTavoloCommand } from './tavolo'
import { registerVotaCommand } from './vota'
import { registerLinkingHandler } from './linking'

// Single CommandGroup (@grammyjs/commands) shared by every register*Command
// — derives Telegram's own "/" picker (setCommands, below) directly from
// what's registered here, so the two can't drift apart.
const commands = new CommandGroup<Context>()

// Ordering is load-bearing: each register*Command's own bot.use(<menu>)
// must run before bot.use(commands), or a command replying with a Menu
// renders nothing (CommandGroup dispatches synchronously, before the
// menu's own reply_markup-rendering middleware has run for that update).
// registerLinkingHandler stays last — its message:text catch-all must only
// see messages no earlier command/prompt handler already claimed.
export function registerCommands(bot: Bot) {
  registerCoreCommands(commands)
  registerClassificheCommand(bot, commands)
  registerEventiCommand(bot, commands)
  registerCalendarioCommand(bot, commands)
  registerLegheCommand(bot, commands)
  registerProssimoCommand(bot, commands)
  registerIscrizioniCommand(bot, commands)
  registerSupportoCommand(bot, commands)
  registerTesseraCommand(commands)
  registerCollegamentoCommand(commands)
  registerTavoloCommand(bot, commands)
  registerVotaCommand(bot, commands)

  bot.use(commands)

  registerLinkingHandler(bot)

  // Best-effort, same reasoning as notify.ts's own best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
