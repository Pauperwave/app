// server\utils\telegram\commands\callbackErrors.ts
import type { Context, InlineKeyboard } from 'grammy'

// The generic "something went wrong loading this" alert every
// callback_query handler's own catch block falls back to (leghe.ts,
// calendario.ts, tournament/detail.ts) — `.catch(() => {})` because this
// already runs from inside a catch block; a second failure here (e.g. the
// callback_query itself is too old to answer) must not throw again.
export async function answerLoadError(ctx: Context) {
  await ctx.answerCallbackQuery({ text: 'Errore nel caricamento', show_alert: true }).catch(() => {})
}

// Shared by calendario.ts's and leghe.ts's list-refresh callbacks: the
// message being edited may have been replaced with a photo one by the
// tournament detail view (image_url tournaments) — editMessageText rejects
// that ("there is no text in the message to edit"), so fall back to
// delete + resend.
export async function editOrResendMessage(
  ctx: Context, text: string, keyboard: InlineKeyboard | undefined
) {
  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard })
  } catch {
    await ctx.deleteMessage().catch(() => {})
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard })
  }
}
