// server\utils\telegram\commands\stubs.ts
import type { Bot } from 'grammy'

// Placeholder commands for every 🔴/⚫ row in docs/architecture/telegram-bot.md
// — registered now so they're discoverable (listed in /help, no "unknown
// command" silence from Telegram) even before the underlying feature exists.
// Each gets pulled out into its own commands/<name>.ts, same shape as
// classifiche.ts, once actually built — remove its entry here when it is.
const PLANNED_STUBS: { command: string, label: string }[] = [
  { command: 'cartecercate', label: 'Carte Cercate' },
  { command: 'prossimotorneo', label: 'Il prossimo torneo' },
  { command: 'tessera', label: 'Stato tesseramento' },
  { command: 'mieitornei', label: 'Tornei a cui sei iscritto' },
  { command: 'mieimazzi', label: 'I tuoi mazzi Commander' },
  { command: 'notifiche', label: 'Notifiche per formato seguito' }
]

// ⚫ rows: blocked on a feature the app itself doesn't have yet (pairing
// system, bracket column), not just "not built in the bot yet" — worded
// differently so it doesn't read as "coming soon".
const BLOCKED_STUBS: { command: string, label: string, reason: string }[] = [
  {
    command: 'tavolo',
    label: 'Tavolo e avversario del turno',
    reason: 'gli abbinamenti esistono nel database solo come storico, non ancora aggiornati in tempo reale durante un torneo'
  },
  {
    command: 'bracket',
    label: 'Imposta il bracket di un mazzo',
    reason: 'manca ancora il campo bracket sui mazzi Commander'
  }
]

export function registerStubCommands(bot: Bot) {
  for (const { command, label } of PLANNED_STUBS) {
    bot.command(command, ctx => ctx.reply(`🚧 "${label}" — non ancora implementato.`))
  }

  for (const { command, label, reason } of BLOCKED_STUBS) {
    bot.command(command, ctx => ctx.reply(`🚧 "${label}" non è ancora disponibile: ${reason}.`))
  }
}
