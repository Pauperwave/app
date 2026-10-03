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
import { registerDiceCommands } from './dice'
import { registerPrezzoCommand } from './cards/prezzo'
import { registerTurniCommand } from './turni'
import { registerTesseraCommand } from './account/tessera'
import { registerCollegamentoCommand } from './account/collegamento'
import { registerTavoloCommand } from './mockups/tavolo'
import { registerRisultatoMenu } from './mockups/risultato'
import { registerCommanderDemoCommand } from './mockups/commanderDemo'
import { registerMatchReportHandlers } from './tournaments/matchReport'
import { registerCommanderReportHandlers } from './tournaments/commanderReport'
import { registerDropCommand } from './tournaments/commanderDrop'
import { registerLinkingHandler } from './account/linking'
import { syncTelegramUsername } from '../usernameSync'

const UNKNOWN_MESSAGE_TEXT = '🤔 Non ho capito questo messaggio. Usa /help per vedere i comandi disponibili.'

// Single CommandGroup (@grammyjs/commands) shared by every register*Command: Telegram's "/" picker
// (setCommands, below) is derived from it, so the two can't drift
const commands = new CommandGroup<Context>()

// Ordering is load-bearing: each register*Command's bot.use(<menu>) must run before
// bot.use(commands), or a command replying with a Menu renders nothing (CommandGroup dispatches
// before the menu's reply_markup middleware runs). registerLinkingHandler stays last: its
// message:text catch-all must only see unclaimed messages.
export function registerCommands(bot: Bot) {
  // First, so every update refreshes the sender's saved username before any handler runs.
  bot.use(syncTelegramUsername)

  registerCoreCommands(bot, commands)
  registerClassificheCommand(bot, commands)
  registerEventiCommand(bot, commands)
  registerCalendarioCommand(bot, commands)
  registerLegheCommand(bot, commands)
  registerProssimoCommand(bot, commands)
  registerIscrizioniCommand(bot, commands)
  registerSupportoCommand(bot, commands)
  registerDiceCommands(commands)
  registerPrezzoCommand(bot, commands)
  registerTurniCommand(commands)
  registerTesseraCommand(commands)
  registerCollegamentoCommand(commands)
  registerCommanderReportHandlers(bot)
  registerDropCommand(commands)
  registerTavoloCommand(bot, commands)
  registerRisultatoMenu(bot)
  registerCommanderDemoCommand(bot)
  registerMatchReportHandlers(bot)

  bot.use(commands)

  registerLinkingHandler(bot)

  // After every register*Command: see registerHelpButtonHandler for why it can't run before their
  // bot.use(<menu>) calls
  registerHelpButtonHandler(bot)

  // Last of all: every handler above calls next() for messages that aren't theirs, so what remains
  // is not a recognized command, prompt reply or linking attempt. Reuses core.ts's helpbtn:
  // mechanism (handleHelpButton).
  bot.on('message:text', ctx => ctx.reply(UNKNOWN_MESSAGE_TEXT, {
    reply_markup: new InlineKeyboard().text('📖 Help', encodeHelpBtn('help'))
  }))

  // Best-effort, like notify.ts's sends: a Telegram hiccup must not block the bot, it would only
  // leave the command picker stale
  commands.setCommands(bot)
    .catch(err => console.error('Failed to sync Telegram command list:', err))
}
