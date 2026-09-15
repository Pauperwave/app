// app\composables\tournaments\useCommanderScoring.ts
// Commander round-scoring math, ported from MagicTheGathering/league's
// shared/utils/roundScoring.ts (user request, 2026-09-15/16: copy the
// scoring logic as-is). league embeds kill count / brew-vote / play-vote
// counts directly on its round_results row; this app normalizes those into
// separate tables (tournament_kills/tournament_votes) instead, so the input
// shape here is a per-player, per-pairing result already enriched with those
// counts by the caller (see useTournamentRoundResultsQuery.ts's own join, or
// advance_commander_round's SQL, migration 20260916000000, which does the
// same aggregation server-side) — the actual formula (dense-to-skip-rank
// conversion, draw detection) is unchanged.
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
 * Score a single player's result at one pod. Shared by useLiveCommanderStandings
 * (the live sidebar) and any read-only per-pod score breakdown, so the two can
 * never drift — same reasoning as league's own calculatePlayerTableScore.
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

  // Positions are stored "dense" (useCommanderRankingGrid.ts enforces a
  // gapless 1,1,2,3 — never a skip-rank 1,1,3,4). Standard tournament
  // scoring needs skip-rank spacing: after a 2-way tie for 1st, the next
  // player is effectively 3rd, since two point-slots were already consumed
  // by the tie. Re-derive that effective starting slot from how many
  // players rank strictly above this one instead of trusting the raw dense
  // position — this makes 1,1,2,3 score identically to its skip-rank
  // equivalent 1,1,3,4.
  const effectivePosition = 1 + tableResults.filter(r =>
    r.position !== null && r.position < position
  ).length

  let rankSum = 0
  for (let i = 0; i < samePositionCount; i++) {
    rankSum += posValues[Math.min(effectivePosition + i, 4)] ?? 0
  }
  const scoreRank = Math.floor(rankSum / samePositionCount)

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
 * "Patta" (draw): zero kills for everyone and everyone tied for 1st. Nobody
 * actually won the table in this case — unlike a genuine 2+-way tie for 1st
 * (which still credits every tied player a victory), a draw credits nobody.
 */
export function isDrawTable(tableResults: CommanderTableResult[]): boolean {
  return tableResults.length > 0
    && tableResults.every(r => r.position === 1)
    && tableResults.every(r => r.numberOfKills === 0)
}
