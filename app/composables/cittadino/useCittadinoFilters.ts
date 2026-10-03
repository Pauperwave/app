// app\composables\cittadino\useCittadinoFilters.ts
import type { Ref } from 'vue'
import type { CittadinoEvent, CittadinoPlacement, CittadinoStanding } from '~/types'
import { groupBestNByPlayer } from '#shared/utils/cittadino/bestNStandings'

// Owns the format filter *and* the scoring, since they can't be separated: hiding a column while
// totals stay computed over every format would show rows that don't add up to their total.
// Filtering to "Pauper" answers "what would the standings be over the Pauper events alone"
export function useCittadinoFilters(
  events: Ref<CittadinoEvent[]>,
  placements: Ref<CittadinoPlacement[]>
) {
  // Every format present in the edition's calendar, in calendar order.
  const formats = computed(() => [...new Set(events.value.map(event => event.format))])

  const selectedFormats = ref<string[]>([])

  // An empty selection means "no filter", not "nothing": the default is correct before the calendar
  // loads, and clearing equals deselecting everything
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
    const visiblePlacements = placements.value.filter(
      placement => visibleEventUuids.has(placement.eventUuid)
    )

    const groups = groupBestNByPlayer(
      visiblePlacements, cittadinoPointsForRank, CITTADINO_COUNTED_RESULTS
    )

    // "Verranno conteggiati solo i migliori 11 punteggi": the total is the sum of the best N
    // results, the rest stay on the row marked as dropped so the matrix shows why they don't add up
    const rows = groups.map<CittadinoStanding>((group) => {
      const bestResults = group.sortedByPoints.slice(0, CITTADINO_COUNTED_RESULTS)

      return {
        position: 0,
        playerUuid: group.playerUuid,
        playerName: group.playerName,
        total: bestResults.reduce((sum, result) => sum + result.points, 0),
        eventsPlayed: group.results.length,
        bestSingle: group.sortedByPoints[0]?.points ?? 0,
        resultsByEvent: group.resultsByEvent
      }
    })

    // First tie-break is the regulation's ("a parità di punteggio passa chi ha fatto il punteggio
    // più alto in singolo evento"); the second, more events played, is ours, not in the written
    // regulation (ADR-012, docs/PROGRESS.md: still to be ratified)
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
