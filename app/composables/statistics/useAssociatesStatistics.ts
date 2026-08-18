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
export function useAssociatesStatistics() {
  const { data: associates, isLoading } = useAssociatesQuery()
  const { data: associateRenewals } = useAssociateRenewalsQuery()

  const approvedAssociates = computed(() => (associates.value ?? [])
    .filter(associate => associate.membership_request_status === 'approved'))

  const currentYear = new Date().getFullYear()

  const totalAssociates = computed(() => approvedAssociates.value.length)

  const newSignupsThisYear = computed(() => approvedAssociates.value
    .filter(associate => associate.association_date
      && new Date(associate.association_date).getFullYear() === currentYear).length)

  // Renewed last year but not yet this year — exactly membership_status
  // 'to_renew' (see pauperwave_associates_with_status view).
  const notRenewedFromLastYear = computed(() => approvedAssociates.value
    .filter(associate => associate.membership_status === 'to_renew').length)

  const medianAge = computed(() => median(approvedAssociates.value
    .map(associate => associate.age)
    .filter((age): age is number => age !== null)))

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

    const renewalYearsByAssociate = new Map<string, number[]>()
    for (const renewal of associateRenewals.value ?? []) {
      const years = renewalYearsByAssociate.get(renewal.associateUuid) ?? []
      years.push(renewal.renewalYear)
      renewalYearsByAssociate.set(renewal.associateUuid, years)
    }

    // "Latest renewal year <= Y" only depends on the year, not the specific
    // month within it — cached per (associate, year) instead of recomputed
    // for all 12 months of that year, since growthSeries is monthly.
    const latestRenewalYearCache = new Map<string, number | null>()
    function latestRenewalYearAsOf(uuid: string, year: number): number | null {
      const cacheKey = `${uuid}:${year}`
      const cached = latestRenewalYearCache.get(cacheKey)
      if (cached !== undefined) return cached

      const yearsUpToNow = (renewalYearsByAssociate.get(uuid) ?? [])
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
    const ages = approvedAssociates.value
      .map(associate => associate.age)
      .filter((age): age is number => age !== null)

    if (!ages.length) return []

    const countsByAge = new Map<number, number>()
    for (const age of ages) countsByAge.set(age, (countsByAge.get(age) ?? 0) + 1)

    const points: AgePoint[] = []
    for (let age = Math.min(...ages); age <= Math.max(...ages); age++) {
      points.push({ age, count: countsByAge.get(age) ?? 0 })
    }
    return points
  })

  // Renewals bucketed by calendar month, across every year — not "renewals
  // per month over time" like growthSeries, but "which month of the year do
  // renewals cluster in", to plan reminder campaigns around. Only approved
  // associates with at least one renewal on record (latest_renewal_date null
  // means never renewed — see 'unpaid' in MembershipStatus).
  const renewalTimingSeries = computed<RenewalMonthPoint[]>(() => {
    const counts = new Array(12).fill(0)
    for (const associate of approvedAssociates.value) {
      if (!associate.latest_renewal_date) continue
      counts[new Date(associate.latest_renewal_date).getMonth()]++
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
