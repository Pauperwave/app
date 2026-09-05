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
  // Disabled unconditionally, not just when a caller's text happens to have a
  // link — cartecercate.ts's card list can carry several scryfall links, and
  // a preview card for whichever one Telegram picks first would be noise on
  // every other caller (calendario.ts, leghe.ts) that has none anyway.
  const options = {
    parse_mode: 'Markdown' as const,
    reply_markup: keyboard,
    link_preview_options: { is_disabled: true }
  }
  try {
    await ctx.editMessageText(text, options)
  } catch {
    await ctx.deleteMessage().catch(() => {})
    await ctx.reply(text, options)
  }
}
