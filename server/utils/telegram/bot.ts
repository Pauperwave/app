// server\utils\telegram\bot.ts
import { Bot } from 'grammy'
import { registerCommands } from './commands'

let bot: Bot | null = null

// Lazily instantiated singleton, reused for the Nitro process's lifetime —
// avoids re-registering command handlers on every webhook request.
export function useTelegramBot(): Bot {
  if (bot) return bot

  const token = useRuntimeConfig().telegramBotToken
  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TELEGRAM_BOT_TOKEN non configurato'
    })
  }

  bot = new Bot(token)
  registerCommands(bot)

  // NOT bot.catch() here — confirmed 2026-09-03 by reading grammy's own
  // source (node_modules/grammy/out/bot.js) that bot.catch() only wires up
  // Bot.handleUpdates (plural, the long-polling bot.start() loop); the
  // webhookCallback path calls handleUpdate (singular) directly, which
  // *rethrows* middleware errors instead of routing them through
  // this.errorHandler. Registering it here would silently do nothing for
  // this app (no bot.start() anywhere) — the actual safety net for webhook
  // mode lives in server/api/telegram/webhook.post.ts, wrapping the
  // webhookCallback() call itself in try/catch.

  return bot
}
