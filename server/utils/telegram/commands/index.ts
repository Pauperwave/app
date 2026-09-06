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
// instead of growing bot.ts's own import list.
//
// Ordering is load-bearing here, confirmed 2026-09-06 after every command
// that replies with a Menu (classifiche, calendario, visibilita, ...) broke
// in production ("doesn't reply"/generic error fallback): each register*Command
// call below does its own bot.use(<menu>) internally — that MUST run before
// bot.use(commands), not after. A Menu's own middleware installs the
// ctx.api.config transformer that turns a `reply_markup: someMenu` object
// into real inline_keyboard JSON; CommandGroup dispatches a matched
// command's handler synchronously within its own middleware turn (not via
// next() to later middleware), so if bot.use(commands) ran first, a command
// handler would call ctx.reply({ reply_markup: someMenu }) before that
// menu's own transformer had ever run for this update — the menu never gets
// rendered. bot.use(commands) has to come after every menu is registered,
// not "first" as the general "commands before catch-alls" rule would
// otherwise suggest.
//
// registerLinkingHandler still stays last: its bot.on('message:text')
// catch-all must only see messages no earlier /command handler already
// claimed. registerSupportoCommand also registers its own
// bot.on('message:text') (ForceReply-based, see supporto.ts) — harmless
// regardless of exact position relative to bot.use(commands) since it only
// ever acts on a reply to its own prompt text, calling next() otherwise.
export function registerCommands(bot: Bot) {
  registerCoreCommands(commands)
  registerClassificheCommand(bot, commands)
  registerEventiCommand(commands)
  registerCalendarioCommand(bot, commands)
  registerLegheCommand(bot, commands)
  registerProssimoCommand(commands)
  registerIscrizioniCommand(bot, commands)
  registerSupportoCommand(bot, commands)
  registerTesseraCommand(commands)
  registerCollegamentoCommand(commands)
  registerStubCommands(commands)

  bot.use(commands)

  registerLinkingHandler(bot)

  // Best-effort, same reasoning as notify.ts's own best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
