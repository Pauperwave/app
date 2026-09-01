// shared\utils\cittadino\bestNStandings.ts

// Shared by useCittadinoFilters.ts and useFormatStandingsQuery.ts (fallow
// dupes, 2026-08-11): both score "sum of the best N placement results over a
// season" from a flat list of per-event placements, with a per-rank point
// scale. What's genuinely different per format stays in each composable —
// participation points, tie-breaks (bestSingle/eventsPlayed), and the row
// shape itself — this only does the grouping, per-rank scoring, and
// best-N/dropped split every format needs first.

export interface BestNPlacement {
  playerUuid: string
  playerName: string
  eventUuid: string
  rank: number
}

// The mock endpoints (server/api/cittadino.ts, server/api/standings/[format].get.ts)
// both return this same snake_case row shape — useCittadinoQuery.ts and
// useFormatStandingsQuery.ts mapped it to BestNPlacement identically.
export interface PlacementRow {
  player_uuid: string
  player_name: string
  event_uuid: string
  rank: number
}

export function toBestNPlacement(row: PlacementRow): BestNPlacement {
  return {
    playerUuid: row.player_uuid,
    playerName: row.player_name,
    eventUuid: row.event_uuid,
    rank: row.rank
  }
}

export interface BestNResult {
  eventUuid: string
  rank: number
  points: number
  counted: boolean
}

export interface BestNPlayerGroup<TResult extends BestNResult> {
  playerUuid: string
  playerName: string
  // Every result the player has, in placement order — dropped ones included.
  results: TResult[]
  // Same results sorted by points descending — bestSingle/best-N slicing both
  // read off this without re-sorting.
  sortedByPoints: TResult[]
  resultsByEvent: Record<string, TResult>
}

// `extraFields` attaches per-format data (e.g. participationPoints) to each
// result without this function needing to know about it.
export function groupBestNByPlayer<
  TPlacement extends BestNPlacement, TExtra extends object = object
>(
  placements: TPlacement[],
  pointsForRank: (rank: number) => number,
  countedResults: number,
  extraFields?: (placement: TPlacement) => TExtra
): BestNPlayerGroup<BestNResult & TExtra>[] {
  type Result = BestNResult & TExtra

  const byPlayer = new Map<string, { name: string, results: Result[] }>()

  for (const placement of placements) {
    const entry = byPlayer.get(placement.playerUuid) ?? { name: placement.playerName, results: [] }
    entry.results.push({
      eventUuid: placement.eventUuid,
      rank: placement.rank,
      points: pointsForRank(placement.rank),
      counted: false,
      ...extraFields?.(placement)
    } as Result)
    byPlayer.set(placement.playerUuid, entry)
  }

  return [...byPlayer.entries()].map(([playerUuid, entry]) => {
    const sortedByPoints = [...entry.results].sort((a, b) => b.points - a.points)
    const counted = new Set(sortedByPoints.slice(0, countedResults))

    const resultsByEvent: Record<string, Result> = {}
    for (const result of entry.results) {
      resultsByEvent[result.eventUuid] = { ...result, counted: counted.has(result) }
    }

    return {
      playerUuid,
      playerName: entry.name,
      results: entry.results,
      sortedByPoints,
      resultsByEvent
    }
  })
}
