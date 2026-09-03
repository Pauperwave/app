// server\utils\telegram\bot.ts
import { Bot } from 'grammy'
import { registerCommands } from './commands'

let bot: Bot | null = null

// Keeps Telegram's own "/" command-picker menu (configured via this API,
// same list @BotFather's /setcommands would set by hand) in sync with
// every bot.command() actually registered across commands/*.ts — every
// command replies to something if tapped (even the stubs, with a "🚧 non
// ancora implementato"), so all of them belong in the picker, not just the
// finished ones.
//
// Same list, pasteable as-is into @BotFather's /setcommands if the API
// call below ever needs a manual fallback:
//
// start - Avvia il bot
// help - Elenco comandi disponibili
// status - Stato del bot
// whoami - Mostra l'id di questa chat
// classifiche - Classifiche per formato
// eventi - Prossimi eventi
// calendario - Prossimi tornei
// leghe - Leghe attive
// prossimo - Il prossimo torneo
// iscrizioni - I tornei a cui sei iscritto
// supporto - Inoltra un messaggio allo staff
// cartecercate - Carte cercate dai soci
// tessera - Stato del tuo tesseramento
// mazzi - I tuoi mazzi Commander
// notifiche - Notifiche per formato seguito
// tavolo - Tavolo e avversario del turno
// vota - Vota miglior mazzo/miglior giocata
const BOT_COMMANDS: { command: string, description: string }[] = [
  { command: 'start', description: 'Avvia il bot' },
  { command: 'help', description: 'Elenco comandi disponibili' },
  { command: 'status', description: 'Stato del bot' },
  { command: 'whoami', description: 'Mostra l\'id di questa chat' },
  { command: 'classifiche', description: 'Classifiche per formato' },
  { command: 'eventi', description: 'Prossimi eventi' },
  { command: 'calendario', description: 'Prossimi tornei' },
  { command: 'leghe', description: 'Leghe attive' },
  { command: 'prossimo', description: 'Il prossimo torneo' },
  { command: 'iscrizioni', description: 'I tornei a cui sei iscritto' },
  { command: 'supporto', description: 'Inoltra un messaggio allo staff' },
  { command: 'cartecercate', description: 'Carte cercate dai soci' },
  { command: 'tessera', description: 'Stato del tuo tesseramento' },
  { command: 'mazzi', description: 'I tuoi mazzi Commander' },
  { command: 'notifiche', description: 'Notifiche per formato seguito' },
  { command: 'tavolo', description: 'Tavolo e avversario del turno' },
  { command: 'vota', description: 'Vota miglior mazzo/miglior giocata' }
]

// Lazily instantiated singleton, reused for the Nitro process's lifetime —
// avoids re-registering command handlers on every webhook request.
export function useTelegramBot(): Bot {
  if (bot) return bot

  const token = useRuntimeConfig().telegramBotToken
  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'TELEGRAM_BOT_TOKEN non configurato'
    })
  }

  bot = new Bot(token)
  registerCommands(bot)

  // Without this, any uncaught error inside a command/callback handler
  // (a bug, a transient Supabase/Telegram hiccup, ...) propagates out of
  // bot.handleUpdate() and the webhook responds 500 — Telegram then
  // queues the update as "pending" and stops delivering new ones until it
  // gets a 200, which looks like "the bot doesn't respond" for every
  // interaction, not just the one that actually failed. Logging here and
  // swallowing the error keeps the webhook always returning 200, so a bug
  // in one command can no longer take the whole bot down. Confirmed
  // 2026-09-03: a callback_query handler that called
  // ctx.answerCallbackQuery() twice (Telegram rejects the second call)
  // was doing exactly this before both the double-answer bug and this
  // safety net were added.
  bot.catch((err) => {
    console.error('Unhandled Telegram bot error:', err.error)
  })

  // Best-effort, same reasoning as notify.ts's best-effort sends — a
  // Telegram hiccup here must never block the bot instance from being
  // usable, it would just leave the command-picker menu stale.
  bot.api.setMyCommands(BOT_COMMANDS)
    .catch(err => console.error('Failed to sync Telegram command list:', err))

  return bot
}
