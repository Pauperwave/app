// app\composables\cittadino\useCittadinoFilters.ts
import type { Ref } from 'vue'
import type { CittadinoEvent, CittadinoPlacement, CittadinoResult, CittadinoStanding } from '~/types'

// Owns the format filter *and* the scoring, because the two cannot be separated:
// hiding a column while leaving the totals computed over every format would show
// a matrix whose rows visibly do not add up to their own total. Filtering to
// "Pauper" therefore answers "what would the standings be over the Pauper events
// alone", which is the only reading where the numbers stay honest.
export function useCittadinoFilters(
  events: Ref<CittadinoEvent[]>,
  placements: Ref<CittadinoPlacement[]>
) {
  // Every format present in the edition's calendar, in calendar order.
  const formats = computed(() => [...new Set(events.value.map(event => event.format))])

  const selectedFormats = ref<string[]>([])

  // An empty selection means "no filter" rather than "nothing": that keeps the
  // default state correct before the calendar has loaded, and makes clearing the
  // filter the same action as deselecting everything.
  const isFiltered = computed(() =>
    selectedFormats.value.length > 0 && selectedFormats.value.length < formats.value.length
  )

  const filteredEvents = computed(() =>
    isFiltered.value
      ? events.value.filter(event => selectedFormats.value.includes(event.format))
      : events.value
  )

  const standings = computed<CittadinoStanding[]>(() => {
    const visibleEventUuids = new Set(filteredEvents.value.map(event => event.uuid))
    const byPlayer = new Map<string, { name: string, results: CittadinoResult[] }>()

    for (const placement of placements.value) {
      if (!visibleEventUuids.has(placement.eventUuid)) continue

      const entry = byPlayer.get(placement.playerUuid)
        ?? { name: placement.playerName, results: [] }
      entry.results.push({
        eventUuid: placement.eventUuid,
        rank: placement.rank,
        points: cittadinoPointsForRank(placement.rank),
        counted: false
      })
      byPlayer.set(placement.playerUuid, entry)
    }

    const rows = [...byPlayer.entries()].map<CittadinoStanding>(([playerUuid, entry]) => {
      // "Verranno conteggiati solo i migliori 11 punteggi" — the total is the sum
      // of the best N results, not of everything played, and the rest stay on the
      // row marked as dropped so the matrix can show why they don't add up.
      const sortedByPoints = [...entry.results].sort((a, b) => b.points - a.points)
      const bestResults = sortedByPoints.slice(0, CITTADINO_COUNTED_RESULTS)
      const counted = new Set(bestResults)

      const resultsByEvent: Record<string, CittadinoResult> = {}
      for (const result of entry.results) {
        resultsByEvent[result.eventUuid] = { ...result, counted: counted.has(result) }
      }

      return {
        position: 0,
        playerUuid,
        playerName: entry.name,
        total: bestResults.reduce((sum, result) => sum + result.points, 0),
        eventsPlayed: entry.results.length,
        bestSingle: sortedByPoints[0]?.points ?? 0,
        resultsByEvent
      }
    })

    // First tie-break is the regulation's: "a parità di punteggio passa chi ha
    // fatto il punteggio più alto in singolo evento". The second — more events
    // played — is ours, not the written regulation's: see ADR-012 in
    // docs/PROGRESS.md for why it was needed and that it still has to be ratified.
    rows.sort((a, b) =>
      b.total - a.total
      || b.bestSingle - a.bestSingle
      || b.eventsPlayed - a.eventsPlayed
    )
    rows.forEach((row, index) => {
      row.position = index + 1
    })

    return rows
  })

  return { formats, selectedFormats, isFiltered, filteredEvents, standings }
}
