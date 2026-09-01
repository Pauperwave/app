// scripts\telegram-set-webhook.mjs
// One-off: registers this deployment's /api/telegram/webhook endpoint with
// Telegram. Re-run whenever NUXT_PUBLIC_SITE_URL, TELEGRAM_BOT_TOKEN, or
// TELEGRAM_WEBHOOK_SECRET changes (e.g. rotating the secret, or first setup
// on a new environment) — Telegram keeps the last-registered URL/secret
// until told otherwise, it doesn't pick up env changes on its own.
//
// Usage:
//   node --env-file=.env scripts/telegram-set-webhook.mjs

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const SITE_URL = process.env.NUXT_PUBLIC_SITE_URL

if (!BOT_TOKEN || !WEBHOOK_SECRET || !SITE_URL) {
  console.error('Missing TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET / NUXT_PUBLIC_SITE_URL in the environment (see .env).')
  process.exit(1)
}

const webhookUrl = new URL('/api/telegram/webhook', SITE_URL).toString()

const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: WEBHOOK_SECRET
  })
})

const result = await response.json()

if (!result.ok) {
  console.error('Telegram setWebhook failed:', result.description)
  process.exit(1)
}

console.log(`Webhook registered: ${webhookUrl}`)
