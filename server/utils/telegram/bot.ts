// server\utils\telegram\bot.ts
import { Bot } from 'grammy'
import { registerCommands } from './commands'

let bot: Bot | null = null

// Lazy singleton for the Nitro process's lifetime, avoiding re-registering handlers on every
// webhook request
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

  // NOT bot.catch(): it only covers Bot.handleUpdates (long-polling), while webhookCallback calls
  // handleUpdate, which rethrows middleware errors. The webhook safety net lives in
  // server/api/telegram/webhook.post.ts.

  return bot
}
