// app\composables\tournaments\pairing\pairingOptimizer.ts
// Greedy + local-swap pairing optimizer with hard constraints and transparent
// scoring details — ported from MagicTheGathering/league's own
// app/composables/event-pairing/pairingOptimizer.ts (user request, 2026-09-15:
// reuse league's real optimizer, not a simplified shuffle). Player identity
// is a string (associate uuid) here instead of league's numeric player id —
// every other formula/weight/constraint is unchanged.
//
// Invariant: for every table, sum(perPlayer[p].total for p in table) === tableScore.total.
// Each weight is applied exactly where its metric is naturally attributable:
//   - strengthBalance is a table-level quantity (rank spread has no single owner), so it's
//     weighted once in calculateStrengthBalance and heuristically redistributed to players.
//   - novelty, rematchPenalty, rotateTable3 are naturally per-pair/per-player (a new pairing
//     belongs to two players, a table3Count belongs to one), so they're weighted once at that
//     attribution point (calculatePairwiseScore / distributeTable3Penalty) AND once more when
//     aggregateTableScore re-weights the raw (unweighted) count for the table-level total.
//   This double application is intentional, not a bug — do not "fix" it by adding the weight
//   to the raw counters (e.g. calculateTable3Penalty) or you will double-weight the metric.
import type { PairingForbiddenPair, PairingWeights } from '~/types'

export interface PairingPlayerScore {
  playerId: string
  strengthBalance: number
  novelty: number
  rematchPenalty: number
  rotateTable3: number
  tableSizeWeight: number
  total: number
}

export interface PairingPlayer {
  id: string
  rank: number
  score: number
  table3Count: number
}

export interface PairingHistoryEntry {
  round: number
  players: string[]
}

interface RematchEntry {
  count: number
  lastRound: number
}

export interface PairingTableScore {
  strengthBalance: number
  novelty: number
  rematchPenalty: number
  rotateTable3: number
  tableSizeWeight: number
  total: number
  players: PairingPlayerScore[]
}

export interface PairingOptimizerResult {
  tables: string[][]
  totalScore: number
  tableScores: PairingTableScore[]
}

export interface PairingScoreDetails {
  totalScore: number
  tableScores: PairingTableScore[]
  isValid: boolean
}

export const DEFAULT_PAIRING_WEIGHTS: PairingWeights = {
  strengthBalance: 1,
  novelty: 1.2,
  rematch: 1.4,
  rotateTable3: 1,
  tableSize4: 0.15,
  tableSize3: -0.15
}

// ── Key / lookup helpers ─────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/** Invoke fn for every unique unordered pair of seats in a table. */
function forEachPair(seats: string[], fn: (left: string, right: string) => void): void {
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const left = seats[i]
      const right = seats[j]
      if (left === undefined || right === undefined) continue
      fn(left, right)
    }
  }
}

function buildForbiddenSet(pairs: PairingForbiddenPair[]): Set<string> {
  const set = new Set<string>()
  for (const pair of pairs) {
    if (pair.playerA === pair.playerB) continue
    set.add(pairKey(pair.playerA, pair.playerB))
  }
  return set
}

function buildRematchMap(history: PairingHistoryEntry[]): Map<string, RematchEntry> {
  const map = new Map<string, RematchEntry>()

  for (const entry of history) {
    forEachPair(entry.players, (left, right) => {
      const key = pairKey(left, right)
      const current = map.get(key)
      if (!current) {
        map.set(key, { count: 1, lastRound: entry.round })
        return
      }

      map.set(key, {
        count: current.count + 1,
        lastRound: Math.max(current.lastRound, entry.round)
      })
    })
  }

  return map
}

function hasForbiddenConflict(table: string[], forbiddenSet: Set<string>): boolean {
  let hasConflict = false
  forEachPair(table, (left, right) => {
    if (forbiddenSet.has(pairKey(left, right))) hasConflict = true
  })
  return hasConflict
}

// ── Scoring primitives (per-table, per-player) ────────────────────────────────

/**
 * Measures how evenly matched players are by their tournament rank. A
 * smaller spread (maxRank - minRank) means better balance — the total
 * strength score is negative, worse spreads score lower.
 */
function calculateStrengthBalance(
  table: string[],
  playersById: Map<string, PairingPlayer>,
  weights: PairingWeights
): { strengthTotal: number, rankByPlayer: Map<string, number> } {
  const ranks = table
    .map(id => playersById.get(id)?.rank ?? 9999)
    .sort((a, b) => a - b)

  let strengthSpreadPenalty = 0
  if (ranks.length > 1) {
    strengthSpreadPenalty = (ranks[ranks.length - 1] ?? 0) - (ranks[0] ?? 0)
  }

  const strengthTotal = -strengthSpreadPenalty * weights.strengthBalance
  const rankByPlayer = new Map<string, number>(
    table.map(playerId => [playerId, playersById.get(playerId)?.rank ?? 9999])
  )

  return { strengthTotal, rankByPlayer }
}

/**
 * Distributes the strength balance score among individual players — those
 * closer to the table's average rank get a smaller share of the (negative)
 * strengthTotal; well-balanced tables split the penalty evenly.
 */
function distributeStrengthBalance(
  table: string[],
  perPlayer: Map<string, PairingPlayerScore>,
  strengthTotal: number,
  rankByPlayer: Map<string, number>
): void {
  if (table.length === 0) return

  const avgRank = table.reduce((acc, playerId) => acc + (rankByPlayer.get(playerId) ?? 9999), 0)
    / table.length
  const deviations = table.map(playerId => ({
    playerId,
    deviation: Math.abs((rankByPlayer.get(playerId) ?? avgRank) - avgRank)
  }))
  const totalDeviation = deviations.reduce((acc, item) => acc + item.deviation, 0)

  for (const item of deviations) {
    const share = totalDeviation > 0
      ? (item.deviation / totalDeviation) * strengthTotal
      : strengthTotal / table.length

    const playerScore = perPlayer.get(item.playerId)
    if (playerScore) {
      playerScore.strengthBalance += share
    }
  }
}

/**
 * A player repeatedly seated at 3-player tables gets fewer games per round
 * (misses one match) — this penalty discourages clustering the same
 * players in short tables across rounds. Total for the table, ≥ 0.
 */
function calculateTable3Penalty(
  table: string[],
  playersById: Map<string, PairingPlayer>
): number {
  if (table.length !== 3) return 0

  return table.reduce((acc, playerId) => {
    const player = playersById.get(playerId)
    return acc + (player?.table3Count ?? 0)
  }, 0)
}

/** Applies each seated player's own table3Count as a negative per-player score component. */
function distributeTable3Penalty(
  table: string[],
  perPlayer: Map<string, PairingPlayerScore>,
  playersById: Map<string, PairingPlayer>,
  weights: PairingWeights
): void {
  if (table.length !== 3) return

  for (const playerId of table) {
    const playerScore = perPlayer.get(playerId)
    if (!playerScore) continue

    const table3Count = playersById.get(playerId)?.table3Count ?? 0
    playerScore.rotateTable3 -= table3Count * weights.rotateTable3
  }
}

/**
 * Novelty and rematch penalties for every pair at a table. Two history
 * sources both fold into `weights.rematch`:
 * - `rematchMap` — pairs met in the CURRENT tournament, with recency decay
 * - `leagueRematchCounts` — raw count of times the pair met in any OTHER
 *   tournament, flat/undecayed (round numbers aren't comparable across
 *   tournaments, so there's no meaningful recency to decay by)
 *
 * For every unique pair: if they've NEVER met (in this tournament or any
 * other), +1 novelty split `weights.novelty / 2` per player. Otherwise,
 * penalty = (inTournamentCount + recencyFactor + leagueCount) * weights.rematch,
 * split equally, where recencyFactor = 1 / (currentRound - lastRound).
 */
function calculatePairwiseScore(
  table: string[],
  perPlayer: Map<string, PairingPlayerScore>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  currentRound: number,
  weights: PairingWeights
): { novelty: number, rematchPenalty: number } {
  let novelty = 0
  let rematchPenalty = 0

  forEachPair(table, (left, right) => {
    const key = pairKey(left, right)
    const rematch = rematchMap.get(key)
    const leagueCount = leagueRematchCounts.get(key) ?? 0

    if (!rematch && leagueCount === 0) {
      novelty += 1
      const leftScore = perPlayer.get(left)
      const rightScore = perPlayer.get(right)
      if (leftScore) leftScore.novelty += weights.novelty / 2
      if (rightScore) rightScore.novelty += weights.novelty / 2
      return
    }

    const roundsAgo = rematch ? Math.max(1, currentRound - rematch.lastRound) : 0
    const recencyFactor = rematch ? 1 / roundsAgo : 0
    const inTournamentCount = rematch?.count ?? 0
    const pairPenalty = inTournamentCount + recencyFactor + leagueCount
    rematchPenalty += pairPenalty

    const penaltyValue = -pairPenalty * weights.rematch / 2
    const leftScore = perPlayer.get(left)
    const rightScore = perPlayer.get(right)
    if (leftScore) leftScore.rematchPenalty += penaltyValue
    if (rightScore) rightScore.rematchPenalty += penaltyValue
  })

  return { novelty, rematchPenalty }
}

/** Aggregates all per-player scores into the table-level total (see file header invariant). */
function aggregateTableScore(
  table: string[],
  perPlayer: Map<string, PairingPlayerScore>,
  weights: PairingWeights,
  params: {
    strengthTotal: number
    novelty: number
    rematchPenalty: number
    rotateTable3: number
  }
): PairingTableScore {
  const {
    strengthTotal, novelty, rematchPenalty, rotateTable3
  } = params
  const size = table.length
  const tableSizeWeight = size === 4 ? weights.tableSize4 : weights.tableSize3
  const tableSizePerPlayer = table.length > 0 ? tableSizeWeight / table.length : 0

  for (const playerId of table) {
    const playerScore = perPlayer.get(playerId)
    if (!playerScore) continue

    playerScore.tableSizeWeight += tableSizePerPlayer
    playerScore.total
      = playerScore.strengthBalance
        + playerScore.novelty
        + playerScore.rematchPenalty
        + playerScore.rotateTable3
        + playerScore.tableSizeWeight
  }

  const total
    = strengthTotal
      + novelty * weights.novelty
      - rematchPenalty * weights.rematch
      - rotateTable3 * weights.rotateTable3
      + tableSizeWeight

  return {
    strengthBalance: strengthTotal,
    novelty: novelty * weights.novelty,
    rematchPenalty: -rematchPenalty * weights.rematch,
    rotateTable3: -rotateTable3 * weights.rotateTable3,
    tableSizeWeight,
    total,
    players: table
      .map(playerId => perPlayer.get(playerId))
      .filter((entry): entry is PairingPlayerScore => entry !== undefined)
  }
}

function scoreTable(
  table: string[],
  playersById: Map<string, PairingPlayer>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  currentRound: number,
  weights: PairingWeights
): PairingTableScore {
  const perPlayer = new Map<string, PairingPlayerScore>()
  for (const playerId of table) {
    perPlayer.set(playerId, {
      playerId,
      strengthBalance: 0,
      novelty: 0,
      rematchPenalty: 0,
      rotateTable3: 0,
      tableSizeWeight: 0,
      total: 0
    })
  }

  const { strengthTotal, rankByPlayer } = calculateStrengthBalance(table, playersById, weights)
  distributeStrengthBalance(table, perPlayer, strengthTotal, rankByPlayer)

  const rotateTable3 = calculateTable3Penalty(table, playersById)
  distributeTable3Penalty(table, perPlayer, playersById, weights)

  const { novelty, rematchPenalty } = calculatePairwiseScore(
    table, perPlayer, rematchMap, leagueRematchCounts, currentRound, weights
  )

  return aggregateTableScore(table, perPlayer, weights, {
    strengthTotal, novelty, rematchPenalty, rotateTable3
  })
}

function scoreSolution(
  tables: string[][],
  playersById: Map<string, PairingPlayer>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  forbiddenSet: Set<string>,
  currentRound: number,
  weights: PairingWeights
): PairingOptimizerResult {
  const tableScores: PairingTableScore[] = []
  let totalScore = 0

  for (const table of tables) {
    if (hasForbiddenConflict(table, forbiddenSet)) {
      return { tables, totalScore: Number.NEGATIVE_INFINITY, tableScores: [] }
    }

    const score = scoreTable(
      table, playersById, rematchMap, leagueRematchCounts, currentRound, weights
    )
    tableScores.push(score)
    totalScore += score.total
  }

  return { tables, totalScore, tableScores }
}

// ── Public scoring API ─────────────────────────────────────────────────────────

/**
 * Scores an already-built table arrangement without modifying it — used to
 * preview/validate a candidate seating (e.g. a manually edited one) with the
 * same scoring function optimizePairings uses internally, so results are
 * directly comparable.
 */
export function scorePairingTables(params: {
  tables: string[][]
  players: PairingPlayer[]
  history: PairingHistoryEntry[]
  forbiddenPairs: PairingForbiddenPair[]
  weights?: Partial<PairingWeights>
  currentRound: number
  leagueRematchCounts?: Map<string, number>
}): PairingScoreDetails {
  const weights: PairingWeights = { ...DEFAULT_PAIRING_WEIGHTS, ...(params.weights ?? {}) }

  const playersById = new Map(params.players.map(p => [p.id, p]))
  const rematchMap = buildRematchMap(params.history)
  const leagueRematchCounts = params.leagueRematchCounts ?? new Map<string, number>()
  const forbiddenSet = buildForbiddenSet(params.forbiddenPairs)

  const result = scoreSolution(
    params.tables, playersById, rematchMap, leagueRematchCounts,
    forbiddenSet, params.currentRound, weights
  )

  return {
    totalScore: result.totalScore,
    tableScores: result.tableScores,
    isValid: Number.isFinite(result.totalScore)
  }
}

// ── Solution construction (greedy) ────────────────────────────────────────────

function removeAt<T>(arr: T[], index: number): T {
  const value = arr[index]
  if (value === undefined) {
    throw new Error('Invalid removeAt index')
  }
  arr.splice(index, 1)
  return value
}

function buildGreedyTables(
  orderedPlayers: PairingPlayer[],
  playersById: Map<string, PairingPlayer>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  forbiddenSet: Set<string>,
  currentRound: number,
  weights: PairingWeights,
  tableSizes: number[]
): string[][] {
  const playerPool = [...orderedPlayers]
  const tables: string[][] = []

  for (const size of tableSizes) {
    if (!playerPool.length) break

    const seed = removeAt(playerPool, 0)
    const table = [seed.id]

    while (table.length < size && playerPool.length) {
      let bestIndex = -1
      let bestScore = Number.NEGATIVE_INFINITY

      for (let i = 0; i < playerPool.length; i++) {
        const candidate = playerPool[i]
        if (!candidate) continue
        const nextTable = [...table, candidate.id]
        if (hasForbiddenConflict(nextTable, forbiddenSet)) continue

        const partialScore = scoreTable(
          nextTable, playersById, rematchMap, leagueRematchCounts, currentRound, weights
        ).total
        if (partialScore > bestScore) {
          bestScore = partialScore
          bestIndex = i
        }
      }

      if (bestIndex === -1) {
        const fallback = removeAt(playerPool, 0)
        table.push(fallback.id)
      } else {
        const picked = removeAt(playerPool, bestIndex)
        table.push(picked.id)
      }
    }

    tables.push(table)
  }

  return tables
}

// ── Solution improvement (local search) ───────────────────────────────────────

function cloneTables(tables: string[][]): string[][] {
  return tables.map(table => [...table])
}

/** Clones `working`, swaps seat `i` of table `t1` with seat `j` of table `t2`, and scores the result. */
function trySwapCandidate(
  working: string[][],
  t1: number,
  t2: number,
  i: number,
  j: number,
  playersById: Map<string, PairingPlayer>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  forbiddenSet: Set<string>,
  currentRound: number,
  weights: PairingWeights
): { candidate: string[][], scored: PairingOptimizerResult } | null {
  const candidate = cloneTables(working)
  const c1 = candidate[t1]
  const c2 = candidate[t2]
  if (!c1 || !c2) return null

  const left = c1[i]
  const right = c2[j]
  if (left === undefined || right === undefined) return null

  c1[i] = right
  c2[j] = left

  const scored = scoreSolution(
    candidate, playersById, rematchMap, leagueRematchCounts, forbiddenSet, currentRound, weights
  )
  return { candidate, scored }
}

function improveBySwap(
  initialTables: string[][],
  playersById: Map<string, PairingPlayer>,
  rematchMap: Map<string, RematchEntry>,
  leagueRematchCounts: Map<string, number>,
  forbiddenSet: Set<string>,
  currentRound: number,
  weights: PairingWeights,
  timeBudgetMs: number
): PairingOptimizerResult {
  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now()
  const started = now()
  let best = scoreSolution(
    initialTables, playersById, rematchMap, leagueRematchCounts, forbiddenSet, currentRound, weights
  )
  let working = cloneTables(initialTables)

  for (let t1 = 0; t1 < working.length; t1++) {
    for (let t2 = t1 + 1; t2 < working.length; t2++) {
      const table1 = working[t1]
      const table2 = working[t2]
      if (!table1 || !table2) continue

      for (let i = 0; i < table1.length; i++) {
        for (let j = 0; j < table2.length; j++) {
          if ((now() - started) >= timeBudgetMs) {
            return best
          }

          const attempt = trySwapCandidate(
            working, t1, t2, i, j,
            playersById, rematchMap, leagueRematchCounts, forbiddenSet, currentRound, weights
          )
          if (attempt && attempt.scored.totalScore > best.totalScore) {
            best = attempt.scored
            working = cloneTables(attempt.candidate)
          }
        }
      }
    }
  }

  return best
}

// ── Public optimization API ───────────────────────────────────────────────────

/**
 * Builds a table seating for the round via multi-start greedy construction +
 * local search. Runs 3 independent attempts, each seeding player order by a
 * different priority (rank, table-3 rotation need, score), builds tables
 * greedily table-by-table — at each seat picking whichever remaining player
 * maximizes the table's running score while respecting forbidden pairs —
 * then improves that result with a pairwise swap search within a time
 * budget (default 120ms total, split evenly across the 3 attempts). The
 * best-scoring result across all 3 attempts is returned.
 */
export function optimizePairings(params: {
  players: PairingPlayer[]
  history: PairingHistoryEntry[]
  forbiddenPairs: PairingForbiddenPair[]
  weights?: Partial<PairingWeights>
  currentRound: number
  swapTimeBudgetMs?: number
  leagueRematchCounts?: Map<string, number>
}): PairingOptimizerResult {
  const {
    players, history, forbiddenPairs, currentRound
  } = params
  const swapTimeBudgetMs = params.swapTimeBudgetMs ?? 120
  const { calculatePods } = useCommanderPods()

  const weights: PairingWeights = { ...DEFAULT_PAIRING_WEIGHTS, ...(params.weights ?? {}) }

  const playersById = new Map(players.map(p => [p.id, p]))
  const forbiddenSet = buildForbiddenSet(forbiddenPairs)
  const rematchMap = buildRematchMap(history)
  const leagueRematchCounts = params.leagueRematchCounts ?? new Map<string, number>()
  const tableSizes = calculatePods(players.length).tableSizes

  // calculatePods returns [] for an unplayable player count (< 3, or exactly
  // 5 — no valid 3/4-seat split exists). Without this guard, every attempt
  // below builds zero tables and scoreSolution([]) returns 0 (its loop never
  // runs) — a *finite* score that beats the initial -Infinity `best`, so
  // optimizePairings would return a spuriously "valid" empty result and the
  // caller (runOptimizer's Number.isFinite check) would silently wipe every
  // seat assignment via replaceByPlayerOrder([]). Real production bug in
  // league (BACKLOG/TODO sweep) — guard kept verbatim.
  if (!tableSizes.length) {
    return { tables: [], totalScore: Number.NEGATIVE_INFINITY, tableScores: [] }
  }

  const orderByRank = [...players].sort((a, b) => a.rank - b.rank)
  const orderByTable3Need = [...players]
    .sort((a, b) => a.table3Count - b.table3Count || a.rank - b.rank)
  const orderByScore = [...players].sort((a, b) => b.score - a.score)
  const attempts = [orderByRank, orderByTable3Need, orderByScore]

  let best: PairingOptimizerResult = {
    tables: tableSizes.map(() => []),
    totalScore: Number.NEGATIVE_INFINITY,
    tableScores: []
  }

  for (const attempt of attempts) {
    const greedyTables = buildGreedyTables(
      attempt, playersById, rematchMap, leagueRematchCounts,
      forbiddenSet, currentRound, weights, tableSizes
    )

    const improved = improveBySwap(
      greedyTables, playersById, rematchMap, leagueRematchCounts,
      forbiddenSet, currentRound, weights,
      Math.max(30, Math.floor(swapTimeBudgetMs / attempts.length))
    )

    if (improved.totalScore > best.totalScore) {
      best = improved
    }
  }

  return best
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export function getForbiddenPairKey(playerA: string, playerB: string): string {
  return pairKey(playerA, playerB)
}

/** Drops self-pairs and duplicate (order-insensitive) entries, keeping first occurrence order. */
export function normalizePairingForbiddenPairs(
  pairs: PairingForbiddenPair[]
): PairingForbiddenPair[] {
  const seen = new Set<string>()
  const result: PairingForbiddenPair[] = []

  for (const pair of pairs) {
    if (pair.playerA === pair.playerB) continue
    const key = getForbiddenPairKey(pair.playerA, pair.playerB)
    if (seen.has(key)) continue

    seen.add(key)
    result.push({ playerA: pair.playerA, playerB: pair.playerB })
  }

  return result
}
