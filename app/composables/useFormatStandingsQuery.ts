// app\composables\useFormatStandingsQuery.ts
import type { Ref } from 'vue'
import type {
  FormatStandingEvent, FormatStandingPlacement, FormatStandingResult, FormatStandingRow
} from '~/types'

export type StandingsFormat = 'commander' | 'premodern' | 'pauper'

interface FormatStandingsResultRow {
  player_uuid: string
  player_name: string
  event_uuid: string
  rank: number
}

interface FormatStandingsLeagueSummary {
  uuid: string
  name: string
}

interface FormatStandingsPayload {
  league: string
  leagues: FormatStandingsLeagueSummary[]
  countedResults: number
  topCutoff: number
  participationPoints: number
  events: FormatStandingEvent[]
  results: FormatStandingsResultRow[]
}

// Same points-by-rank scale across every format for a visually consistent mock —
// see server/api/standings/[format].get.ts for why the rest (counted-results,
// top-cutoff, calendar) is per-league rather than per-format or fixed here.
const POINTS_BY_RANK = [25, 18, 15, 12, 10, 8, 6, 4, 2]
const MIN_POINTS = 1

export const FORMAT_STANDINGS_MAX_POINTS = POINTS_BY_RANK[0]!
export const FORMAT_STANDINGS_MIN_POINTS = MIN_POINTS

function pointsForRank(rank: number): number {
  return POINTS_BY_RANK[rank - 1] ?? MIN_POINTS
}

interface PlayerEntry {
  name: string
  results: Array<FormatStandingResult & { eventUuid: string }>
}

// Backed by mock data (no Supabase table yet, see
// server/api/standings/[format].get.ts) — shared by every /standings/<format>
// page. `selectedLeague` is null until the user picks a tab: the endpoint
// resolves a missing/unknown league to the current one, same pattern as
// useCittadinoQuery.ts's `selectedEdition`.
export function useFormatStandingsQuery(
  format: StandingsFormat,
  selectedLeague: Ref<string | null>
) {
  const {
    data, pending: loading, error, refresh
  } = useAsyncData(
    () => `standings-${format}-${selectedLeague.value ?? 'current'}`,
    () => $fetch<FormatStandingsPayload>(`/api/standings/${format}`, {
      query: { league: selectedLeague.value ?? undefined }
    }),
    {
      default: () => ({
        league: '',
        leagues: [],
        countedResults: 0,
        topCutoff: 0,
        participationPoints: 0,
        events: [],
        results: []
      }),
      watch: [selectedLeague]
    }
  )

  const league = computed(() => data.value.league)
  const leagues = computed(() => data.value.leagues)
  const countedResults = computed(() => data.value.countedResults)
  const topCutoff = computed(() => data.value.topCutoff)
  const participationPoints = computed(() => data.value.participationPoints)
  const events = computed<FormatStandingEvent[]>(() => data.value.events)

  const placements = computed<FormatStandingPlacement[]>(() => data.value.results.map(row => ({
    playerUuid: row.player_uuid,
    playerName: row.player_name,
    eventUuid: row.event_uuid,
    rank: row.rank
  })))

  const standings = computed<FormatStandingRow[]>(() => {
    const byPlayer = new Map<string, PlayerEntry>()

    for (const placement of placements.value) {
      const entry: PlayerEntry = byPlayer.get(placement.playerUuid)
        ?? { name: placement.playerName, results: [] }
      entry.results.push({
        eventUuid: placement.eventUuid,
        rank: placement.rank,
        points: pointsForRank(placement.rank),
        counted: false,
        participationPoints: participationPoints.value
      })
      byPlayer.set(placement.playerUuid, entry)
    }

    const rows = [...byPlayer.entries()].map<FormatStandingRow>(([playerUuid, entry]) => {
      const sortedByPoints = [...entry.results].sort((a, b) => b.points - a.points)
      const counted = new Set(sortedByPoints.slice(0, countedResults.value))

      const resultsByEvent: FormatStandingRow['resultsByEvent'] = {}
      for (const result of entry.results) {
        resultsByEvent[result.eventUuid] = { ...result, counted: counted.has(result) }
      }

      // Placement points only count for the player's best-N results, but the
      // participation point is flat and unconditional — awarded for every event
      // played, counted or dropped.
      const placementTotal = [...counted].reduce((sum, result) => sum + result.points, 0)
      const participationTotal = entry.results
        .reduce((sum, result) => sum + result.participationPoints, 0)

      return {
        position: 0,
        playerUuid,
        playerName: entry.name,
        total: placementTotal + participationTotal,
        resultsByEvent
      }
    })

    rows.sort((a, b) => b.total - a.total)
    rows.forEach((row, index) => {
      row.position = index + 1
    })

    return rows
  })

  return {
    league,
    leagues,
    countedResults,
    topCutoff,
    participationPoints,
    events,
    standings,
    loading,
    error,
    refresh
  }
}
