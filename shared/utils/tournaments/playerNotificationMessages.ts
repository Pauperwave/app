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

export interface TableSeat extends TableOpponent {
  /** The player this message is sent to. */
  isYou: boolean
}

// A pod lists the whole table in seat order (player1..player4), the recipient marked "👉 Tu".
function podSeatingText(seats: TableSeat[]): string {
  const yourSeat = seats.findIndex(seat => seat.isYou) + 1
  const lines = seats.map((seat, index) =>
    `${index + 1}. ${seat.isYou ? '👉 Tu' : opponentLabel(seat)}`)
  return `💺 Sei al posto ${yourSeat}\n\nAl tavolo:\n${lines.join('\n')}`
}

// `seats` is the whole table in seat order, the recipient included. A 1v1 table keeps
// "Giochi contro: …"; a pod shows the seating (user request, 2026-10-02).
export function tableAnnouncedMessage(input: {
  tournamentName: string
  roundNumber: number
  tableNumber: number | null
  seats: TableSeat[]
}): string {
  const {
    tournamentName,
    roundNumber,
    tableNumber,
    seats
  } = input
  const place = tableNumber === null ? '🪑 Il tuo tavolo' : `🪑 Tavolo ${tableNumber}`
  const header = `${place} · ${tournamentName} · Round ${roundNumber}`
  const footer = 'Per inserire il risultato usa /tavolo.'

  if (seats.length > 2) return `${header}\n${podSeatingText(seats)}\n\n${footer}`

  const opponents = seats.filter(seat => !seat.isYou)
  return `${header}\n\n${opponentsText(opponents)}\n\n${footer}`
}

export function roundTablesCancelledMessage(tournamentName: string, roundNumber: number): string {
  return `⚠️ I tavoli del Round ${roundNumber} di ${tournamentName} sono stati annullati.`
}

export function tournamentResetMessage(tournamentName: string): string {
  return `⚠️ ${tournamentName} è stato resettato: i tavoli sono annullati.`
}
