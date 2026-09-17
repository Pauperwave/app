// app\composables\tournaments\pairing\useCommanderStandingsSort.ts
// Single tie-break rule for standings, ported from MagicTheGathering/league's
// shared/utils/standingsSort.ts (user request, 2026-09-15/16: copy as-is).
// Order: total score, victories, kills, brew votes received, play votes
// received, then playerUuid as a stable last resort (deterministic — avoids
// rank flicker between otherwise-tied players on recompute).
//
// Victories and kills come before brew/play votes on purpose (ADR-047 in
// league): they're objective, derived directly from what happened in-game,
// and hard to game. Vote-based criteria are assigned by other players at the
// table — subjective, with a real "courtesy vote between friends" risk in a
// small recurring league. When the total score ties, the criteria hardest to
// influence socially get exhausted first.
export interface StandingSortable {
  playerUuid: string
  score: number | null
  victories: number | null
  kills?: number | null
  brewReceived: number | null
  playReceived: number | null
}

export function compareCommanderStandings(a: StandingSortable, b: StandingSortable): number {
  const scoreDiff = (b.score ?? 0) - (a.score ?? 0)
  if (scoreDiff !== 0) return scoreDiff

  const victoriesDiff = (b.victories ?? 0) - (a.victories ?? 0)
  if (victoriesDiff !== 0) return victoriesDiff

  const killsDiff = (b.kills ?? 0) - (a.kills ?? 0)
  if (killsDiff !== 0) return killsDiff

  const brewDiff = (b.brewReceived ?? 0) - (a.brewReceived ?? 0)
  if (brewDiff !== 0) return brewDiff

  const playDiff = (b.playReceived ?? 0) - (a.playReceived ?? 0)
  if (playDiff !== 0) return playDiff

  return a.playerUuid.localeCompare(b.playerUuid)
}
