// shared\utils\cittadino\bestNStandings.ts

// Shared by useCittadinoFilters.ts and useFormatStandingsQuery.ts: "sum of the best N placements
// over a season" from flat per-event placements. Only grouping, per-rank scoring and the
// best-N/dropped split live here; participation points, tie-breaks and row shape stay in each
// composable.

export interface BestNPlacement {
  playerUuid: string
  playerName: string
  eventUuid: string
  rank: number
  // Already-scored result (real data); when absent, points come from the rank scale
  points?: number
}

// Snake_case row returned by the standings endpoints (server/api/cittadino.ts,
// server/api/standings/[format].get.ts)
export interface PlacementRow {
  player_uuid: string
  player_name: string
  event_uuid: string
  rank: number
  points?: number
}

export function toBestNPlacement(row: PlacementRow): BestNPlacement {
  return {
    playerUuid: row.player_uuid,
    playerName: row.player_name,
    eventUuid: row.event_uuid,
    rank: row.rank,
    points: row.points
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
  // Every result in placement order, dropped ones included
  results: TResult[]
  // Same results by points descending, so bestSingle/best-N slicing needs no re-sort
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
      points: placement.points ?? pointsForRank(placement.rank),
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
