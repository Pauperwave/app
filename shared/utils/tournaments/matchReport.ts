// shared\utils\tournaments\matchReport.ts
// A 1v1 result reported by one player and confirmed by the other (Telegram bot):
// which outcomes exist, how one becomes the pairing's two scores, and who may
// report or answer a pending report.
export type ReportStatus = 'pending' | 'disputed'

export interface PendingReport {
  reporterUuid: string
  status: ReportStatus
}

export type ReportBlock = 'not-a-player' | 'match-completed' | 'already-reported'
export type RespondBlock = 'not-a-player' | 'match-completed' | 'no-report' | 'own-report' | 'already-disputed'

export interface MatchOutcome {
  label: string
  gamesWon: number
  gamesLost: number
}

// Why a player can't report this match, or null if they can. One report per
// pairing: a wrong one is disputed by the opponent and the organizer decides.
export function reportBlockReason(input: {
  pairingStatus: string
  isParticipant: boolean
  report: PendingReport | null
}): ReportBlock | null {
  if (!input.isParticipant) return 'not-a-player'
  if (input.pairingStatus === 'completed') return 'match-completed'
  if (input.report) return 'already-reported'
  return null
}

// Why a player can't confirm/dispute the report, or null if they can. Only the
// opponent answers: the reporter confirming their own report would defeat it.
export function respondBlockReason(input: {
  pairingStatus: string
  isParticipant: boolean
  responderUuid: string
  report: PendingReport | null
}): RespondBlock | null {
  if (!input.isParticipant) return 'not-a-player'
  if (input.pairingStatus === 'completed') return 'match-completed'
  if (!input.report) return 'no-report'
  if (input.report.reporterUuid === input.responderUuid) return 'own-report'
  if (input.report.status === 'disputed') return 'already-disputed'
  return null
}

// The reporter picks an outcome from their own side; the pairing stores it as
// player1/player2
export function gamesFromOutcome(outcome: MatchOutcome, reporterIsPlayer1: boolean) {
  return reporterIsPlayer1
    ? { player1GamesWon: outcome.gamesWon, player2GamesWon: outcome.gamesLost }
    : { player1GamesWon: outcome.gamesLost, player2GamesWon: outcome.gamesWon }
}

// "2-1" as the viewer sees it (their games first)
export function scoreLabelFor(
  games: { player1GamesWon: number, player2GamesWon: number },
  viewerIsPlayer1: boolean
): string {
  return viewerIsPlayer1
    ? `${games.player1GamesWon}-${games.player2GamesWon}`
    : `${games.player2GamesWon}-${games.player1GamesWon}`
}

// The five valid best-of-3 scores, same as ck_tournament_match_results_score
export const MATCH_OUTCOMES: MatchOutcome[] = [
  { label: '2-0', gamesWon: 2, gamesLost: 0 },
  { label: '2-1', gamesWon: 2, gamesLost: 1 },
  { label: '1-1', gamesWon: 1, gamesLost: 1 },
  { label: '1-2', gamesWon: 1, gamesLost: 2 },
  { label: '0-2', gamesWon: 0, gamesLost: 2 }
]
