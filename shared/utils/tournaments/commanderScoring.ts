// shared\utils\tournaments\commanderScoring.ts
// Commander round-scoring math, ported unchanged from league's roundScoring.ts. Kills and votes
// live in separate tables here (tournament_kills/tournament_votes), so the input is a per-player,
// per-pairing result already enriched with those counts by the caller
// (useTournamentRoundResultsQuery.ts's join, or advance_commander_round's SQL server-side).
//
// Lives in shared/ so the Telegram bot's Commander score summary (commanderReport.ts) uses the same
// formula.
export interface CommanderTableResult {
  playerUuid: string
  /** Raw dense position as stored (null = no result submitted yet). */
  position: number | null
  numberOfKills: number
  brewVotesReceived: number
  playVotesReceived: number
}

export interface RulesetPointValues {
  rank1: number
  rank2: number
  rank3: number
  rank4: number
  kill: number
  brew: number
  play: number
}

export interface PlayerTableScore {
  playerUuid: string
  position: number
  scoreRank: number
  numberOfKills: number
  killScore: number
  brewVotesReceived: number
  brewScore: number
  playVotesReceived: number
  playScore: number
  totalScore: number
}

export function buildPosValues(r: RulesetPointValues): number[] {
  return [0, r.rank1, r.rank2, r.rank3, r.rank4]
}

/**
 * Scores one player's result at one pod; shared by useLiveCommanderStandings and per-pod breakdowns
 * so they can't drift.
 */
export function calculatePlayerTableScore(
  playerUuid: string,
  tableResults: CommanderTableResult[],
  posValues: number[],
  ruleset: RulesetPointValues
): PlayerTableScore | null {
  const myResult = tableResults.find(r => r.playerUuid === playerUuid)
  if (!myResult || myResult.position === null) return null

  const position = myResult.position
  const samePositionCount = tableResults.filter(r => r.position === position).length

  // Positions are stored "dense" (1,1,2,3) but scoring needs skip-rank spacing (1,1,3,4): after a
  // 2-way tie for 1st the next player is effectively 3rd. Derive the slot from how many players
  // rank strictly above.
  const effectivePosition = 1 + tableResults.filter(r =>
    r.position !== null && r.position < position
  ).length

  // A dense position p means p - 1 distinct positions sit above it. If those aren't entered yet
  // (e.g. the only seat entered so far is "4th"), the effective position above is wrong — it
  // would read as 1st — so the placement is worth nothing until the seats above are known.
  const knownPositionsAbove = new Set(tableResults
    .map(r => r.position)
    .filter((other): other is number => other !== null && other < position)).size
  const isRankResolved = knownPositionsAbove >= position - 1

  let rankSum = 0
  for (let i = 0; i < samePositionCount; i++) {
    rankSum += posValues[Math.min(effectivePosition + i, 4)] ?? 0
  }
  const scoreRank = isRankResolved ? Math.floor(rankSum / samePositionCount) : 0

  const killScore = myResult.numberOfKills * ruleset.kill
  const brewScore = myResult.brewVotesReceived * ruleset.brew
  const playScore = myResult.playVotesReceived * ruleset.play

  return {
    playerUuid,
    position,
    scoreRank,
    numberOfKills: myResult.numberOfKills,
    killScore,
    brewVotesReceived: myResult.brewVotesReceived,
    brewScore,
    playVotesReceived: myResult.playVotesReceived,
    playScore,
    totalScore: scoreRank + killScore + brewScore + playScore
  }
}

/**
 * "Patta" (draw): zero kills and everyone tied for 1st. Unlike a real 2+-way tie for 1st, it
 * credits nobody with a win.
 */
export function isDrawTable(tableResults: CommanderTableResult[]): boolean {
  return tableResults.length > 0
    && tableResults.every(r => r.position === 1)
    && tableResults.every(r => r.numberOfKills === 0)
}
