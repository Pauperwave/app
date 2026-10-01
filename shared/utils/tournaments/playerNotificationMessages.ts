// shared\utils\tournaments\playerNotificationMessages.ts
// Texts of the passive Telegram notifications a player receives without
// sending a command (accepted at a tournament, tables announced/cancelled).
export function registrationAcceptedMessage(tournamentName: string): string {
  return `✅ Sei stato accettato a ${tournamentName}.`
}

export interface TableOpponent {
  name: string
  /** Telegram @username without the "@", when the player is linked and has one. */
  telegramUsername?: string | null
}

function opponentLabel(opponent: TableOpponent): string {
  return opponent.telegramUsername
    ? `${opponent.name} (@${opponent.telegramUsername})`
    : opponent.name
}

// One opponent stays on a line ("Giochi contro: …"); a pod is a bulleted list, one player per line.
export function opponentsText(opponents: TableOpponent[]): string {
  const [only] = opponents
  if (opponents.length === 1 && only) return `Giochi contro: ${opponentLabel(only)}`
  return `Giochi con:\n${opponents.map(opponent => `- ${opponentLabel(opponent)}`).join('\n')}`
}

export function tableAnnouncedMessage(input: {
  tournamentName: string
  roundNumber: number
  tableNumber: number | null
  opponents: TableOpponent[]
}): string {
  const {
    tournamentName,
    roundNumber,
    tableNumber,
    opponents
  } = input
  const place = tableNumber === null ? '🪑 Il tuo tavolo' : `🪑 Tavolo ${tableNumber}`
  const header = `${place} · ${tournamentName} · Round ${roundNumber}`
  return `${header}\n\n${opponentsText(opponents)}\n\nPer inserire il risultato usa /tavolo.`
}

export function roundTablesCancelledMessage(tournamentName: string, roundNumber: number): string {
  return `⚠️ I tavoli del Round ${roundNumber} di ${tournamentName} sono stati annullati.`
}

export function tournamentResetMessage(tournamentName: string): string {
  return `⚠️ ${tournamentName} è stato resettato: i tavoli sono annullati.`
}
