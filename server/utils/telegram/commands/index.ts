// server\utils\telegram\commands\index.ts
import type { Bot, Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import { CommandGroup } from '@grammyjs/commands'

import { registerCoreCommands, registerHelpButtonHandler, encodeHelpBtn } from './core'
import { registerClassificheCommand } from './standings/classifiche'
import { registerEventiCommand } from './events/eventi'
import { registerCalendarioCommand } from './tournaments/calendario'
import { registerLegheCommand } from './tournaments/leghe'
import { registerProssimoCommand } from './tournaments/prossimo'
import { registerIscrizioniCommand } from './tournaments/iscrizioni'
import { registerSupportoCommand } from './supporto'
import { registerDioporcoCommand } from './dioporco'
import { registerDiceCommands } from './dice'
import { registerTesseraCommand } from './account/tessera'
import { registerCollegamentoCommand } from './account/collegamento'
import { registerTavoloCommand } from './mockups/tavolo'
import { registerRisultatoCommand } from './mockups/risultato'
import { registerLinkingHandler } from './account/linking'

const UNKNOWN_MESSAGE_TEXT = '🤔 Non ho capito questo messaggio. Usa /help per vedere i comandi disponibili.'

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
  registerCoreCommands(bot, commands)
  registerClassificheCommand(bot, commands)
  registerEventiCommand(bot, commands)
  registerCalendarioCommand(bot, commands)
  registerLegheCommand(bot, commands)
  registerProssimoCommand(bot, commands)
  registerIscrizioniCommand(bot, commands)
  registerSupportoCommand(bot, commands)
  registerDioporcoCommand(bot)
  registerDiceCommands(commands)
  registerTesseraCommand(commands)
  registerCollegamentoCommand(commands)
  registerTavoloCommand(bot, commands)
  registerRisultatoCommand(bot, commands)

  bot.use(commands)

  registerLinkingHandler(bot)

  // Registered after every register*Command above — see registerHelpButtonHandler's
  // own comment on why it can't run before the bot.use(<menu>) calls those
  // functions make (a /help button reusing a command whose reply needs its
  // own menu would otherwise fail to send).
  registerHelpButtonHandler(bot)

  // Registered last of all — every other handler above calls next() when a
  // message isn't theirs to handle, so anything still unclaimed here is
  // genuinely not a recognized command, prompt reply, or linking attempt.
  // Reuses core.ts's own helpbtn: mechanism (handleHelpButton, registered
  // bot-wide) instead of a separate callback_query handler just for this.
  bot.on('message:text', ctx => ctx.reply(UNKNOWN_MESSAGE_TEXT, {
    reply_markup: new InlineKeyboard().text('📖 Help', encodeHelpBtn('help'))
  }))

  // Best-effort, same reasoning as notify.ts's own best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
