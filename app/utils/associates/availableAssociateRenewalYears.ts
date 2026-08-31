// app\utils\associates\availableAssociateRenewalYears.ts
import type { Associate } from '~/types'

// Shared by associates/index.vue's YearRangePicker — every year with at
// least one renewal, plus the real current year even if it's still empty,
// sorted newest first. latest_renewal_date is nullable (an associate who
// never renewed) — those are skipped here, not counted as "year 1970".
// Same shape as availableTransactionYears.ts.
export function availableAssociateRenewalYears(associates: Associate[]): number[] {
  const years = new Set(
    associates
      .filter((associate): associate is Associate & { latest_renewal_date: string } =>
        !!associate.latest_renewal_date)
      .map(associate => new Date(associate.latest_renewal_date).getFullYear())
  )
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
