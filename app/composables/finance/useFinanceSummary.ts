// app\composables\finance\useFinanceSummary.ts
// Aggregates /finance's summary tables off the same 'transactions' Pinia Colada cache
// /transactions reads: no separate fetch or source of truth. The aggregations themselves are
// utils/finance/summarizeTransactions.ts
import type { Transaction } from '~/types'

export * from './financeSummaryTypes'

export function useFinanceSummary(transactions: Ref<Transaction[]>, year: Ref<number>) {
  const tournamentsByUuid = useTournamentsByUuid()

  // The same lookup for the events, for byEvent's startDate column
  const { data: eventsData } = useEventsQuery()
  const eventsByUuid = computed(() =>
    new Map((eventsData.value ?? []).map(event => [event.uuid, event])))

  const byTournament = computed(() =>
    summarizeByTournament(transactions.value, tournamentsByUuid.value))
  const byEvent = computed(() => summarizeByEvent(transactions.value, eventsByUuid.value))
  const byFormat = computed(() => summarizeByFormat(transactions.value, tournamentsByUuid.value))
  const byCategory = computed(() => summarizeByCategory(transactions.value, byFormat.value))
  const byType = computed(() => summarizeByType(transactions.value))
  const byMethodCost = computed(() => summarizeByMethodCost(transactions.value))
  const byMonth = computed(() => summarizeByMonth(transactions.value, year.value))

  const grandTotal = computed(() => byType.value.reduce((sum, row) => sum + row.total, 0))
  const grandCount = computed(() => byType.value.reduce((sum, row) => sum + row.count, 0))
  const totalFees = computed(() => byMethodCost.value.reduce((sum, row) => sum + row.fee, 0))
  const grandNet = computed(() => grandTotal.value - totalFees.value)
  const grandAverage = computed(() => grandCount.value ? grandTotal.value / grandCount.value : 0)

  return {
    byType, byMonth, byTournament, byEvent, byFormat, byCategory, byMethodCost,
    grandTotal, grandCount, totalFees, grandNet, grandAverage
  }
}
