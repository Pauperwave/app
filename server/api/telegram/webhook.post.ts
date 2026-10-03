// server\api\telegram\webhook.post.ts
import { webhookCallback } from 'grammy'

// Telegram calls this for every update. The 'std/http' adapter takes/returns Fetch API
// Request/Response, which h3 handles natively. grammy checks X-Telegram-Bot-Api-Secret-Token
// against telegramWebhookSecret (401 on mismatch), so it must match the secret passed to
// scripts/telegram-set-webhook.mjs.
export default defineEventHandler(async (event) => {
  const bot = useTelegramBot()
  const secretToken = useRuntimeConfig(event).telegramWebhookSecret

  const handleUpdate = webhookCallback(bot, 'std/http', { secretToken })

  // bot.catch() only covers long-polling: webhookCallback calls bot.handleUpdate(), which rethrows
  // middleware errors. Uncaught, Nitro answers 500 and Telegram stops delivering ALL updates until
  // it gets a 200, so one broken handler would take the bot offline. Always answer 200.
  try {
    return await handleUpdate(toWebRequest(event))
  } catch (err) {
    console.error('Unhandled Telegram webhook error:', err)
    return new Response(null, { status: 200 })
  }
})
