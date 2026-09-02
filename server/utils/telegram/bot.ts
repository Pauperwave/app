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

  return bot
}
