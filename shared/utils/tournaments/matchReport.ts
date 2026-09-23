// shared\utils\tournaments\matchReport.ts
// A 1v1 result reported by one player via the Telegram bot: written straight
// to tournament_match_results (same as an organizer's own entry), with the
// opponent then asked to confirm or dispute it — a dispute flags an
// already-saved result for organizer review, it doesn't revert it (user
// request, 2026-09-24).
export interface ReportedResult {
  reporterUuid: string
  confirmedAt: string | null
  disputedAt: string | null
}

export type ReportBlock = 'not-a-player' | 'match-completed'
export type RespondBlock = 'not-a-player' | 'no-report' | 'own-report' | 'already-confirmed' | 'already-disputed'

export interface MatchOutcome {
  label: string
  gamesWon: number
  gamesLost: number
}

// Why a player can't report this match, or null if they can. One result per
// pairing: a wrong one is disputed by the opponent and the organizer decides.
export function reportBlockReason(input: {
  pairingStatus: string
  isParticipant: boolean
}): ReportBlock | null {
  if (!input.isParticipant) return 'not-a-player'
  if (input.pairingStatus === 'completed') return 'match-completed'
  return null
}

// Why a player can't confirm/dispute the result, or null if they can. Only the
// opponent answers: the reporter confirming their own report would defeat it.
export function respondBlockReason(input: {
  isParticipant: boolean
  responderUuid: string
  result: ReportedResult | null
}): RespondBlock | null {
  if (!input.isParticipant) return 'not-a-player'
  if (!input.result) return 'no-report'
  if (input.result.reporterUuid === input.responderUuid) return 'own-report'
  if (input.result.confirmedAt) return 'already-confirmed'
  if (input.result.disputedAt) return 'already-disputed'
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
