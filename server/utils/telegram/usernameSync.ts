// server\utils\telegram\usernameSync.ts
// Keeps pauperwave_associate_telegram_links.telegram_username current: every update the bot
// receives from a private chat already carries the sender's username, so a changed (or newly set,
// or removed) one is saved the next time that person writes to the bot. Best-effort — a failure
// is logged and never stops the update from being handled.
import type { Context, NextFunction } from 'grammy'

// Telegram usernames are letters, digits and underscores: anything else is not saved, and the
// check also keeps the value safe to put in the filter below.
const USERNAME_PATTERN = /^\w+$/

export async function syncTelegramUsername(ctx: Context, next: NextFunction) {
  try {
    await saveUsernameIfChanged(ctx)
  } catch (error) {
    console.error('Failed to sync the Telegram username:', error)
  }

  return next()
}

async function saveUsernameIfChanged(ctx: Context) {
  // A group's chat id is not a person's link; links are keyed on the private chat.
  if (ctx.chat?.type !== 'private') return

  const username = ctx.from?.username ?? null
  if (username !== null && !USERNAME_PATTERN.test(username)) return

  const query = telegramServiceSupabaseClient()
    .from('pauperwave_associate_telegram_links')
    .update({ telegram_username: username })
    .eq('chat_id', ctx.chat.id)

  // Only a row whose saved username differs is written; an unlinked chat matches nothing.
  const { error } = username === null
    ? await query.not('telegram_username', 'is', null)
    : await query.or(`telegram_username.is.null,telegram_username.neq.${username}`)

  if (error) throw error
}
