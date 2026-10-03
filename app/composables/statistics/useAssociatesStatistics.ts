// app\composables\statistics\useAssociatesStatistics.ts
import { eachMonthOfInterval, endOfMonth } from 'date-fns'

export interface AssociatesGrowthPoint {
  date: Date
  total: number
  // Joined in this exact month: a flow, not a running total
  newCount: number
  // Joined before this month and renewed for this month's year (per the full renewal history, see
  // useAssociateRenewalsQuery.ts)
  retained: number
  // Joined before this month and did NOT renew for this month's year (lapsed, or never renewed)
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

// Derives everything from useAssociatesQuery's cached list (no dedicated stats endpoint), like
// associates/index.vue's associatesStatusCounts. selectedYear drives only the point-in-time
// cards/charts (new signups, not-renewed, renewal timing, age); the multi-year growthSeries is
// historical and deliberately unaffected, since filtering it to one year defeats its purpose.
export function useAssociatesStatistics(selectedYear: Ref<number> = ref(new Date().getFullYear())) {
  const { data: associates, isLoading } = useAssociatesQuery()
  const { data: associateRenewals } = useAssociateRenewalsQuery()

  const approvedAssociates = computed(() => (associates.value ?? [])
    .filter(associate => associate.membership_request_status === 'approved'))

  const totalAssociates = computed(() => approvedAssociates.value.length)

  const newSignupsThisYear = computed(() => approvedAssociates.value
    .filter(associate => associate.association_date
      && new Date(associate.association_date).getFullYear() === selectedYear.value).length)

  // Reused by notRenewedFromLastYear and growthSeries: one associate's full renewal-year history,
  // not just latest_renewal_year
  const renewalYearsByAssociate = computed(() => {
    const map = new Map<string, number[]>()
    for (const renewal of associateRenewals.value ?? []) {
      const years = map.get(renewal.associateUuid) ?? []
      years.push(renewal.renewalYear)
      map.set(renewal.associateUuid, years)
    }
    return map
  })

  // Renewed the year before the selected one but not (yet) for it: reconstructed from the full
  // renewal history to answer "as of year Y", unlike membership_status 'to_renew' which only
  // reflects now
  const notRenewedFromLastYear = computed(() => approvedAssociates.value
    .filter((associate) => {
      const years = renewalYearsByAssociate.value.get(associate.uuid) ?? []
      return years.includes(selectedYear.value - 1) && !years.includes(selectedYear.value)
    }).length)

  // Only associates who renewed for the selected year: this chart is "who was a member in year Y",
  // not "who is a member today"
  const membersInSelectedYear = computed(() => approvedAssociates.value
    .filter(associate => (renewalYearsByAssociate.value.get(associate.uuid) ?? [])
      .includes(selectedYear.value)))

  // Age as of Dec 31 of the selected year, not associate.age (always "age today" from the view's
  // CURRENT_DATE): computed from born_date so medianAge/ageDistribution answer "as of year Y".
  // Day/month precision is moot by Dec 31
  const agesAsOfSelectedYear = computed(() => membersInSelectedYear.value
    .map(associate => (associate.born_date
      ? selectedYear.value - new Date(associate.born_date).getFullYear()
      : null))
    .filter((age): age is number => age !== null))

  const medianAge = computed(() => median(agesAsOfSelectedYear.value))

  // Cumulative member count by month, split into new/retained/not-renewed, from the founding year
  // (PAUPERWAVE_FOUNDING_YEAR) to today, not the earliest association_date (which would crop the
  // real, memberless early years). Renewal status in a past month is reconstructed from the full
  // renewal-year history; a plain total hides whether the pile grows or is refilled by churn
  const growthSeries = computed<AssociatesGrowthPoint[]>(() => {
    const withDates = approvedAssociates.value
      .filter(associate => associate.association_date)
      .map(associate => ({
        uuid: associate.uuid,
        date: new Date(associate.association_date as string)
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (!withDates.length) return []

    // "Latest renewal year <= Y" depends only on the year: cached per (associate, year) rather than
    // per month
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

  // One bar per age (not a bucketed histogram), zero-filled across the [min, max] range present (no
  // silently cropped gaps)
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

  // Renewals bucketed by calendar month for the selected year ("which month do renewals cluster
  // in", to plan reminders). Reads renewal_date off the full history, not latest_renewal_date (one
  // date per associate, can't answer a past year)
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
