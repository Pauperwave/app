// server\utils\telegram\commands\index.ts
import { CommandGroup } from '@grammyjs/commands'
import type { Bot, Context } from 'grammy'
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
import { registerVisibilitaCommand } from './visibilita'
import { registerCollegamentoCommand } from './collegamento'
import { registerStubCommands } from './stubs'
import { registerLinkingHandler } from './linking'

// Single source of truth for every /command's name + description + handler
// (@grammyjs/commands, 2026-09-06) — replaces bot.ts's hand-maintained
// BOT_COMMANDS array and each file's own bot.command() call. Every
// register*Command below takes this same instance and calls
// commands.command(name, description, handler) instead of bot.command();
// registerCommands() derives Telegram's own "/" picker directly from
// whatever's actually registered here (setCommands(), in bot.ts), so the
// two can no longer drift apart the way BOT_COMMANDS repeatedly did.
const commands = new CommandGroup<Context>()

// Single entry point for bot.ts — add a new command's register call here
// instead of growing bot.ts's own import list. registerLinkingHandler stays
// last: its bot.on('message:text') catch-all must only see messages no
// earlier /command handler already claimed. registerSupportoCommand also
// registers its own bot.on('message:text') (ForceReply-based, see
// supporto.ts) — must come before registerLinkingHandler for the same
// reason, though it isn't itself a plain catch-all.
//
// bot.use(commands) is wired first, before any bot.on() handler gets
// attached below — grammy fixes middleware order by call order, and the
// CommandGroup's own middleware must run ahead of both message:text
// catch-alls. It re-resolves its command list lazily on every update (not
// once at this call), so commands registered afterward by the calls below
// are still included once real updates start arriving.
export function registerCommands(bot: Bot) {
  bot.use(commands)

  registerCoreCommands(commands)
  registerClassificheCommand(bot, commands)
  registerEventiCommand(commands)
  registerCalendarioCommand(bot, commands)
  registerLegheCommand(bot, commands)
  registerProssimoCommand(commands)
  registerIscrizioniCommand(bot, commands)
  registerSupportoCommand(bot, commands)
  registerCarteCercateCommand(bot, commands)
  registerTesseraCommand(commands)
  registerMazziCommand(commands)
  registerVisibilitaCommand(bot, commands)
  registerCollegamentoCommand(commands)
  registerStubCommands(commands)
  registerLinkingHandler(bot)

  // Best-effort, same reasoning as notify.ts's own best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
