// server\utils\telegram\commands\index.ts
import type { Bot, Context } from 'grammy'
import { CommandGroup } from '@grammyjs/commands'

import { registerCoreCommands } from './core'
import { registerClassificheCommand } from './standings/classifiche'
import { registerEventiCommand } from './events/eventi'
import { registerCalendarioCommand } from './tournaments/calendario'
import { registerLegheCommand } from './tournaments/leghe'
import { registerProssimoCommand } from './tournaments/prossimo'
import { registerIscrizioniCommand } from './tournaments/iscrizioni'
import { registerSupportoCommand } from './supporto'
import { registerTesseraCommand } from './account/tessera'
import { registerCollegamentoCommand } from './account/collegamento'
import { registerTavoloCommand } from './mockups/tavolo'
import { registerVotaCommand } from './mockups/vota'
import { registerRisultatoCommand } from './mockups/risultato'
import { registerLinkingHandler } from './account/linking'

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
  registerRisultatoCommand(bot, commands)

  bot.use(commands)

  registerLinkingHandler(bot)

  // Best-effort, same reasoning as notify.ts's own best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
