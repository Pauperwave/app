// server\utils\telegram\notify.ts
// Chat ids are Telegram's, not this app's user/associate ids — the caller
// must already know which chat to target. There is no
// associate-to-Telegram-chat link yet (see docs/PROGRESS.md), so today the
// only consumer is notifyTelegramAdmins.
export async function sendTelegramMessage(chatId: number | string, text: string) {
  const bot = useTelegramBot()
  await bot.api.sendMessage(chatId, text)
}

// No-op when TELEGRAM_ADMIN_CHAT_ID isn't set, so admin alerts stay optional
// per environment (e.g. skipped in local dev) instead of throwing.
export async function notifyTelegramAdmins(text: string) {
  const chatId = useRuntimeConfig().telegramAdminChatId
  if (!chatId) return

  await sendTelegramMessage(chatId, text)
}
