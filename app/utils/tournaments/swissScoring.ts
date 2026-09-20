// app\utils\tournaments\swissScoring.ts
// Official Magic Tournament Rules scoring (MTR 3.1 and Appendix C) for
// best-of-3 1v1 matches: win = 3, draw = 1, loss = 0 match points, ranked by
// points, then OMW% (opponents' match-win %), GW% (game-win %) and OGW%
// (opponents' game-win %). Every percentage is floored at 0.33, so a very weak
// opponent doesn't punish a player. A bye counts as a 2-0 win (3 match points,
// 2 games won) and is ignored when computing the opponents' percentages. These
// values are fixed by the rules, deliberately not settings.

export interface SwissMatch {
  player1Uuid: string
  player2Uuid: string
  player1GamesWon: number
  player2GamesWon: number
}

export interface SwissStandingStats {
  playerUuid: string
  matchPoints: number
  wins: number
  draws: number
  losses: number
  /** Opponents' match-win %, 0-1 */
  omw: number
  /** Own game-win %, 0-1 */
  gw: number
  /** Opponents' game-win %, 0-1 */
  ogw: number
}

export const SWISS_WIN_POINTS = 3
export const SWISS_DRAW_POINTS = 1
const PERCENTAGE_FLOOR = 0.33

interface Accumulator {
  wins: number
  draws: number
  losses: number
  gamesWon: number
  gamesLost: number
  opponents: string[]
}

function matchWinPercentage(acc: Accumulator): number {
  const matchesPlayed = acc.wins + acc.draws + acc.losses
  if (matchesPlayed === 0) return PERCENTAGE_FLOOR

  const points = acc.wins * SWISS_WIN_POINTS + acc.draws * SWISS_DRAW_POINTS
  return Math.max(PERCENTAGE_FLOOR, points / (SWISS_WIN_POINTS * matchesPlayed))
}

function gameWinPercentage(acc: Accumulator): number {
  const gamesPlayed = acc.gamesWon + acc.gamesLost
  if (gamesPlayed === 0) return PERCENTAGE_FLOOR

  return Math.max(PERCENTAGE_FLOOR, acc.gamesWon / gamesPlayed)
}

function averageOf(values: number[]): number {
  if (values.length === 0) return PERCENTAGE_FLOOR
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/**
 * Standings sorted best first; players tied on every criterion keep their input
 * order. `byePlayerUuids` has one entry per bye received.
 */
export function calculateSwissStandings(
  playerUuids: string[],
  matches: SwissMatch[],
  byePlayerUuids: string[] = []
): SwissStandingStats[] {
  const accumulators = new Map<string, Accumulator>()
  for (const playerUuid of playerUuids) {
    accumulators.set(playerUuid, {
      wins: 0, draws: 0, losses: 0, gamesWon: 0, gamesLost: 0, opponents: []
    })
  }

  function record(
    playerUuid: string,
    opponentUuid: string,
    gamesWon: number,
    gamesLost: number
  ) {
    const acc = accumulators.get(playerUuid)
    if (!acc) return

    if (gamesWon > gamesLost) acc.wins += 1
    else if (gamesWon < gamesLost) acc.losses += 1
    else acc.draws += 1
    acc.gamesWon += gamesWon
    acc.gamesLost += gamesLost
    acc.opponents.push(opponentUuid)
  }

  for (const playerUuid of byePlayerUuids) {
    const acc = accumulators.get(playerUuid)
    if (!acc) continue

    acc.wins += 1
    acc.gamesWon += 2
  }

  for (const match of matches) {
    record(match.player1Uuid, match.player2Uuid, match.player1GamesWon, match.player2GamesWon)
    record(match.player2Uuid, match.player1Uuid, match.player2GamesWon, match.player1GamesWon)
  }

  function opponentsAverage(acc: Accumulator, percentageOf: (opponent: Accumulator) => number) {
    const percentages = acc.opponents.flatMap((opponentUuid) => {
      const opponent = accumulators.get(opponentUuid)
      return opponent ? [percentageOf(opponent)] : []
    })
    return averageOf(percentages)
  }

  const standings = Array.from(accumulators, ([playerUuid, acc]): SwissStandingStats => {
    return {
      playerUuid,
      matchPoints: acc.wins * SWISS_WIN_POINTS + acc.draws * SWISS_DRAW_POINTS,
      wins: acc.wins,
      draws: acc.draws,
      losses: acc.losses,
      omw: opponentsAverage(acc, matchWinPercentage),
      gw: gameWinPercentage(acc),
      ogw: opponentsAverage(acc, gameWinPercentage)
    }
  })

  return standings.sort((a, b) =>
    b.matchPoints - a.matchPoints
    || b.omw - a.omw
    || b.gw - a.gw
    || b.ogw - a.ogw)
}
