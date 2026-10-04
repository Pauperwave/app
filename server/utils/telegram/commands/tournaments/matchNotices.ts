// server\utils\telegram\commands\tournaments\matchNotices.ts
import { ICONS } from '~~/server/utils/telegram/icons'

// What the other player of a 1v1 table is told when someone acts on the result. The name in each is
// always the one who acted (the recipient's opponent), never the recipient's own.

// `score` is from the recipient's side, their own games first
export function reportedNoticeText(actorName: string, roundNumber: number, score: string): string {
  return `Per il match del Round ${roundNumber} ${actorName} ha inserito ${score} (i tuoi game per primi). È corretto?`
}

export function confirmedNoticeText(actorName: string, roundNumber: number, score: string): string {
  return `${ICONS.success} ${actorName} ha confermato il risultato del Round ${roundNumber}: ${score}`
}

export function disputedNoticeText(actorName: string, roundNumber: number): string {
  return `${ICONS.warning} ${actorName} ha contestato il risultato del Round ${roundNumber}: `
    + 'l\'organizzatore lo verificherà.'
}
