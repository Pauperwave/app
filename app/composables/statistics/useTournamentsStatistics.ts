// app\composables\statistics\useTournamentsStatistics.ts
export interface TournamentsByFormatPoint {
  format: string
  count: number
}

// One point per year with a count per format (not just a total), so the "hosted per year" chart
// shows the format breakdown
export interface TournamentsPerYearByFormatPoint {
  year: number
  counts: Record<string, number>
}

// "Hosted" excludes 'cancelled' (never happened) and 'draft' (not committed
// yet) — only tournaments that were or are actually running count.
const HOSTED_STATUSES = ['registration_open', 'in_progress', 'completed'] as const

// selectedYear drives only tournamentsThisYear: perYearByFormatSeries is a historical series and
// stays unaffected (like useAssociatesStatistics.ts's growthSeries)
export function useTournamentsStatistics(
  selectedYear: Ref<number> = ref(new Date().getFullYear())
) {
  const { data: tournaments, isLoading } = useTournamentsQuery()

  const hostedTournaments = computed(() => (tournaments.value ?? [])
    .filter(tournament => (HOSTED_STATUSES as readonly string[]).includes(tournament.status)))

  const currentYear = new Date().getFullYear()

  const tournamentsThisYear = computed(() => hostedTournaments.value
    .filter(
      tournament => new Date(tournament.startDate).getFullYear() === selectedYear.value
    ).length)

  // Sorted by count desc (a format bar chart reads better as a ranking, unlike
  // perYearByFormatSeries' natural time order); also the canonical list+order of formats it stacks
  const byFormatSeries = computed<TournamentsByFormatPoint[]>(() => {
    const countsByFormat = new Map<string, number>()
    for (const tournament of hostedTournaments.value) {
      countsByFormat.set(tournament.format, (countsByFormat.get(tournament.format) ?? 0) + 1)
    }
    return [...countsByFormat.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([format, count]) => ({ format, count }))
  })

  // One point per year since the founding year (PAUPERWAVE_FOUNDING_YEAR), zero-filled for years
  // with no tournament (else the axis would start where the data does), each with a per-format
  // count, not just a yearly total
  const perYearByFormatSeries = computed<TournamentsPerYearByFormatPoint[]>(() => {
    const years: number[] = []
    for (let year = PAUPERWAVE_FOUNDING_YEAR; year <= currentYear; year++) years.push(year)

    return years.map((year) => {
      const counts: Record<string, number> = {}
      for (const tournament of hostedTournaments.value) {
        if (new Date(tournament.startDate).getFullYear() !== year) continue
        counts[tournament.format] = (counts[tournament.format] ?? 0) + 1
      }
      return { year, counts }
    })
  })

  return {
    isLoading, tournamentsThisYear, byFormatSeries, perYearByFormatSeries
  }
}
