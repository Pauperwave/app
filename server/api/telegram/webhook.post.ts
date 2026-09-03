// server\api\telegram\webhook.post.ts
import { webhookCallback } from 'grammy'

// Telegram calls this for every update (message, command, ...). The
// 'std/http' adapter takes/returns standard Fetch API Request/Response
// objects, which h3 accepts and returns natively — no extra glue needed.
// grammy itself checks the X-Telegram-Bot-Api-Secret-Token header against
// telegramWebhookSecret and responds 401 on a mismatch, so the secret must
// match the one passed when registering the webhook
// (scripts/telegram-set-webhook.mjs).
export default defineEventHandler(async (event) => {
  const bot = useTelegramBot()
  const secretToken = useRuntimeConfig(event).telegramWebhookSecret

  const handleUpdate = webhookCallback(bot, 'std/http', { secretToken })

  // grammy's bot.catch() only applies to the long-polling bot.start() loop
  // (Bot.handleUpdates, plural) — webhookCallback calls bot.handleUpdate()
  // (singular) directly, which *rethrows* any middleware error instead of
  // routing it through bot.catch() (confirmed 2026-09-03 by reading
  // node_modules/grammy/out/bot.js: handleUpdate's catch block wraps and
  // throws a BotError, only handleUpdates' own try/catch calls
  // this.errorHandler). Uncaught here means Nitro turns it into a 500,
  // which Telegram then queues as "pending" and stops delivering *any* new
  // update until it gets a 200 — one broken command/callback effectively
  // took the whole bot offline. Always resolving 200, error or not, is the
  // actual fix for webhook-mode grammy; per-handler try/catch (calendario.ts
  // et al.) only helps for errors those handlers know to expect.
  try {
    return await handleUpdate(toWebRequest(event))
  } catch (err) {
    console.error('Unhandled Telegram webhook error:', err)
    return new Response(null, { status: 200 })
  }
})
