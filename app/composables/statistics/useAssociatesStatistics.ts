// app\composables\statistics\useAssociatesStatistics.ts
import { eachMonthOfInterval, endOfMonth } from 'date-fns'

export interface AssociatesGrowthPoint {
  date: Date
  total: number
  // Joined in this exact month — a flow, not a running total.
  newCount: number
  // Joined before this month and renewed for this month's year (per the
  // full pauperwave_associate_renewals history, not just latest_renewal_year
  // — see useAssociateRenewalsQuery.ts).
  retained: number
  // Joined before this month and did NOT renew for this month's year
  // (lapsed, or never renewed at all).
  notRenewed: number
}

export interface AgePoint {
  age: number
  count: number
}

export interface RenewalMonthPoint {
  month: number
  count: number
}

// Derives everything from useAssociatesQuery's already-cached list — no
// dedicated stats endpoint, same "compute from data already fetched"
// approach as associates/index.vue's own associatesStatusCounts.
// selectedYear drives only the point-in-time cards/charts (new signups,
// not-renewed, renewal timing, median/distribution of age) — the multi-year
// growthSeries below is a historical series and intentionally stays
// unaffected by it (user decision, 2026-08-26: filtering it to one year
// would defeat its purpose).
export function useAssociatesStatistics(selectedYear: Ref<number> = ref(new Date().getFullYear())) {
  const { data: associates, isLoading } = useAssociatesQuery()
  const { data: associateRenewals } = useAssociateRenewalsQuery()

  const approvedAssociates = computed(() => (associates.value ?? [])
    .filter(associate => associate.membership_request_status === 'approved'))

  const totalAssociates = computed(() => approvedAssociates.value.length)

  const newSignupsThisYear = computed(() => approvedAssociates.value
    .filter(associate => associate.association_date
      && new Date(associate.association_date).getFullYear() === selectedYear.value).length)

  // Reused by notRenewedFromLastYear and growthSeries — one associate's full
  // renewal-year history, not just the view's latest_renewal_year.
  const renewalYearsByAssociate = computed(() => {
    const map = new Map<string, number[]>()
    for (const renewal of associateRenewals.value ?? []) {
      const years = map.get(renewal.associateUuid) ?? []
      years.push(renewal.renewalYear)
      map.set(renewal.associateUuid, years)
    }
    return map
  })

  // Renewed the year before the selected one but not (yet) for the selected
  // year itself — reconstructed from the full renewal history so it can
  // answer "as of year Y", not just today (unlike membership_status
  // 'to_renew', which only ever reflects the current moment).
  const notRenewedFromLastYear = computed(() => approvedAssociates.value
    .filter((associate) => {
      const years = renewalYearsByAssociate.value.get(associate.uuid) ?? []
      return years.includes(selectedYear.value - 1) && !years.includes(selectedYear.value)
    }).length)

  // Only associates who actually renewed for the selected year — someone
  // approved today but who joined/renewed in a later year shouldn't show up
  // in year Y's age distribution just because they're a member now (user
  // decision, 2026-08-26: this chart is "who was a member in year Y", not
  // "who is a member today").
  const membersInSelectedYear = computed(() => approvedAssociates.value
    .filter(associate => (renewalYearsByAssociate.value.get(associate.uuid) ?? [])
      .includes(selectedYear.value)))

  // Age as of Dec 31 of the selected year, not associate.age (always "age
  // today", from the view's CURRENT_DATE-based computation) — computed from
  // born_date directly so medianAge/ageDistribution can answer "as of year
  // Y" like the other point-in-time cards (user decision, 2026-08-26).
  // Day/month precision doesn't matter here: everyone has already had their
  // birthday by Dec 31 of any given year.
  const agesAsOfSelectedYear = computed(() => membersInSelectedYear.value
    .map(associate => (associate.born_date
      ? selectedYear.value - new Date(associate.born_date).getFullYear()
      : null))
    .filter((age): age is number => age !== null))

  const medianAge = computed(() => median(agesAsOfSelectedYear.value))

  // Cumulative member count by month, split into new/retained/not-renewed
  // — from the association's actual founding year (PAUPERWAVE_FOUNDING_YEAR)
  // to today, not from the earliest association_date, which would silently
  // crop off the (real, just memberless) early years the association still
  // existed for. Renewal status "as of" a past month is reconstructed from
  // the full renewal-year history (useAssociateRenewalsQuery.ts) — a plain
  // per-month total hides whether the pile is genuinely growing or just
  // getting refilled by people who never stick around, this doesn't.
  const growthSeries = computed<AssociatesGrowthPoint[]>(() => {
    const withDates = approvedAssociates.value
      .filter(associate => associate.association_date)
      .map(associate => ({
        uuid: associate.uuid,
        date: new Date(associate.association_date as string)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (!withDates.length) return []

    // "Latest renewal year <= Y" only depends on the year, not the specific
    // month within it — cached per (associate, year) instead of recomputed
    // for all 12 months of that year, since growthSeries is monthly.
    const latestRenewalYearCache = new Map<string, number | null>()
    function latestRenewalYearAsOf(uuid: string, year: number): number | null {
      const cacheKey = `${uuid}:${year}`
      const cached = latestRenewalYearCache.get(cacheKey)
      if (cached !== undefined) return cached

      const yearsUpToNow = (renewalYearsByAssociate.value.get(uuid) ?? [])
        .filter(renewalYear => renewalYear <= year)
      const latest = yearsUpToNow.length ? Math.max(...yearsUpToNow) : null
      latestRenewalYearCache.set(cacheKey, latest)
      return latest
    }

    const start = new Date(PAUPERWAVE_FOUNDING_YEAR, 0, 1)
    return eachMonthOfInterval({ start, end: new Date() }).map((month) => {
      const cutoff = endOfMonth(month)
      const year = month.getFullYear()

      let newCount = 0
      let retained = 0
      let notRenewed = 0

      for (const associate of withDates) {
        if (associate.date > cutoff) continue

        const joinedThisMonth = associate.date.getFullYear() === year
          && associate.date.getMonth() === month.getMonth()
        if (joinedThisMonth) {
          newCount++
          continue
        }

        if (latestRenewalYearAsOf(associate.uuid, year) === year) retained++
        else notRenewed++
      }

      return {
        date: month, total: newCount + retained + notRenewed, newCount, retained, notRenewed
      }
    })
  })

  // One bar per age (not a bucketed histogram) — zero-filled across the
  // whole [min, max] range actually present, same "no silently-cropped
  // gaps" reasoning as growthSeries/perYearSeries above.
  const ageDistribution = computed<AgePoint[]>(() => {
    const ages = agesAsOfSelectedYear.value

    if (!ages.length) return []

    const countsByAge = new Map<number, number>()
    for (const age of ages) countsByAge.set(age, (countsByAge.get(age) ?? 0) + 1)

    const points: AgePoint[] = []
    for (let age = Math.min(...ages); age <= Math.max(...ages); age++) {
      points.push({ age, count: countsByAge.get(age) ?? 0 })
    }
    return points
  })

  // Renewals bucketed by calendar month, for the selected year only — "which
  // month of the year do renewals cluster in", to plan reminder campaigns
  // around. Reads renewal_date directly off the full renewal history (not
  // latest_renewal_date, which only ever holds one — the most recent — date
  // per associate and can't answer "renewals in year Y" for a past year).
  const renewalTimingSeries = computed<RenewalMonthPoint[]>(() => {
    const counts = new Array(12).fill(0)
    for (const renewal of associateRenewals.value ?? []) {
      if (renewal.renewalYear !== selectedYear.value) continue
      counts[new Date(renewal.renewalDate).getMonth()]++
    }
    return counts.map((count, month) => ({ month, count }))
  })

  return {
    isLoading,
    totalAssociates,
    newSignupsThisYear,
    notRenewedFromLastYear,
    medianAge,
    growthSeries,
    ageDistribution,
    renewalTimingSeries
  }
}
