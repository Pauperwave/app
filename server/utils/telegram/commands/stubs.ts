// server\utils\telegram\commands\stubs.ts
import type { Context } from 'grammy'
import type { CommandGroup } from '@grammyjs/commands'

// Placeholder commands for every ⚫ row in docs/architecture/telegram-bot.md
// — registered now so they're discoverable (listed in /help, no "unknown
// command" silence from Telegram) even before the underlying feature exists.
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
    command: 'vota',
    label: 'Vota miglior mazzo/miglior giocata',
    reason: 'il voto è legato a un abbinamento reale, che non esiste finché non c\'è un flusso di pairing live durante un torneo'
  }
]

export function registerStubCommands(commands: CommandGroup<Context>) {
  for (const { command, label, reason } of BLOCKED_STUBS) {
    commands.command(command, label, ctx => ctx.reply(`🚧 "${label}" non è ancora disponibile: ${reason}.`))
  }
}
