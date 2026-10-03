// app\utils\associates\availableAssociateRequestYears.ts
import type { Associate } from '~/types'

// Shared by associates/requests.vue's YearRangePicker: every year with a request plus the current
// year, newest first (like availableTransactionYears.ts)
export function availableAssociateRequestYears(associates: Associate[]): number[] {
  const years = new Set(associates.map(
    associate => new Date(associate.request_date).getFullYear()
  ))
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}
