// server\utils\telegram\commands\callbackErrors.ts
import type { Context } from 'grammy'

// The generic "something went wrong loading this" alert every
// callback_query handler's own catch block falls back to (leghe.ts,
// calendario.ts, tournament/detail.ts) — `.catch(() => {})`
// because this already runs from inside a catch block; a second failure
// here (e.g. the callback_query itself is too old to answer) must not
// throw again.
export async function answerLoadError(ctx: Context) {
  await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true }).catch(() => {})
}

// Shared "no chat id -> dismiss the callback query and bail" guard every
// button-press handler needing a real chat id used to duplicate inline
// (detail.ts, leghe.ts, calendario.ts).
export async function requireChatId(ctx: Context): Promise<number | null> {
  const chatId = ctx.chat?.id
  if (!chatId) {
    await ctx.answerCallbackQuery().catch(() => {})
    return null
  }
  return chatId
}
