// server\api\telegram\webhook.post.ts
import { webhookCallback } from 'grammy'

// Telegram calls this for every update (message, command, ...). The
// 'std/http' adapter takes/returns standard Fetch API Request/Response
// objects, which h3 accepts and returns natively — no extra glue needed.
// grammy itself checks the X-Telegram-Bot-Api-Secret-Token header against
// telegramWebhookSecret and responds 401 on a mismatch, so the secret must
// match the one passed when registering the webhook
// (scripts/telegram-set-webhook.mjs).
export default defineEventHandler((event) => {
  const bot = useTelegramBot()
  const secretToken = useRuntimeConfig(event).telegramWebhookSecret

  const handleUpdate = webhookCallback(bot, 'std/http', { secretToken })
  return handleUpdate(toWebRequest(event))
})
