// shared\utils\tournaments\playerNotificationMessages.ts
// Texts of the passive Telegram notifications a player receives without
// sending a command (accepted at a tournament, tables announced/cancelled).
export function registrationAcceptedMessage(tournamentName: string): string {
  return `✅ Sei stato accettato a ${tournamentName}.`
}

export function tableAnnouncedMessage(input: {
  tournamentName: string
  roundNumber: number
  tableNumber: number | null
  opponentNames: string[]
}): string {
  const {
    tournamentName,
    roundNumber,
    tableNumber,
    opponentNames
  } = input
  const place = tableNumber === null ? '🪑 Il tuo tavolo' : `🪑 Tavolo ${tableNumber}`
  const header = `${place} · ${tournamentName} · Round ${roundNumber}`
  const verb = opponentNames.length === 1 ? 'Giochi contro' : 'Giochi con'
  return `${header}\n\n${verb}: ${opponentNames.join(', ')}\n\nPer inserire il risultato usa /tavolo.`
}

export function roundTablesCancelledMessage(tournamentName: string, roundNumber: number): string {
  return `⚠️ I tavoli del Round ${roundNumber} di ${tournamentName} sono stati annullati.`
}

export function tournamentResetMessage(tournamentName: string): string {
  return `⚠️ ${tournamentName} è stato resettato: i tavoli sono annullati.`
}
