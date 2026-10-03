// server\utils\telegram\commands\callbackErrors.ts
import type { Context } from 'grammy'

// The generic "something went wrong loading this" alert every callback_query handler's catch falls
// back to. `.catch(() => {})` because it already runs inside a catch: a second failure (e.g. a
// callback too old to answer) must not throw.
export async function answerLoadError(ctx: Context) {
  await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true }).catch(() => {})
}

// Shared "no chat id -> dismiss the callback query and bail" guard for button-press handlers
// needing a chat id
export async function requireChatId(ctx: Context): Promise<number | null> {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return null
  }
  return chatId
}
