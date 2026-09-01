// test\unit\composables\finance\useFinanceSummary.test.ts
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useFinanceSummary } from '~/composables/finance/useFinanceSummary'
import type { Tournament, Transaction } from '~/types'

const tournaments: Tournament[] = [
  {
    uuid: 't1', name: 'Pauper 1a tappa', stageNumber: 1, league: 'Lega Pauper', leagueUuid: 'l1',
    format: 'Pauper', startDate: new Date(2026, 0, 10).toISOString(), status: 'completed'
  } as Tournament,
  {
    uuid: 't2', name: 'Draft Night', stageNumber: null, league: null, leagueUuid: null,
    format: 'Draft', startDate: new Date(2026, 1, 5).toISOString(), status: 'completed'
  } as Tournament
]

const events: { uuid: string, name: string, startDate: string }[] = [
  { uuid: 'ev1', name: 'Commanderwave Fest', startDate: new Date(2026, 4, 30).toISOString() }
]

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('~/composables/tournaments/useTournamentsQuery', () => ({
  useTournamentsQuery: () => ({ data: ref(tournaments) })
}))
vi.mock('~/composables/events/useEventsQuery', () => ({
  useEventsQuery: () => ({ data: ref(events) })
}))

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    payment_type: 'Donation',
    payment_method: 'Cash',
    payment_amount: 10,
    payment_date: new Date(2026, 0, 15).toISOString(),
    tournament: null,
    event: null,
    event_name: null,
    ...overrides
  } as unknown as Transaction
}

describe('useFinanceSummary', () => {
  const year = ref(2026)

  it('byTournament aggregates only transactions linked to a real tournament', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_type: 'Tournament Fee', payment_amount: 20, tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 2, payment_type: 'Tournament Fee', payment_amount: 30, tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 3, payment_type: 'Tournament Fee', payment_amount: 15, tournament: { uuid: 'unknown' } as never })
    ])
    const { byTournament } = useFinanceSummary(transactions, year)
    expect(byTournament.value).toHaveLength(1)
    expect(byTournament.value[0]).toMatchObject({ uuid: 't1', count: 2, total: 50, average: 25 })
  })

  it('byTournament tracks comped/cash/POS sub-totals', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_amount: 20, payment_method: 'Comped', tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 2, payment_amount: 30, payment_method: 'Cash', tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 3, payment_amount: 40, payment_method: 'POS', tournament: { uuid: 't1' } as never })
    ])
    const { byTournament } = useFinanceSummary(transactions, year)
    const row = byTournament.value[0]!
    expect(row.compedCount).toBe(1)
    expect(row.cashTotal).toBe(30)
    expect(row.posTotal).toBe(40)
  })

  it('byEvent rolls Token Purchase (gettoni) revenue into the event row separately from count/total', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_type: 'Event Fee', payment_amount: 15, event: { uuid: 'ev1' } as never }),
      makeTransaction({ id: 2, payment_type: 'Token Purchase', payment_amount: 7.5, event: { uuid: 'ev1' } as never })
    ])
    const { byEvent } = useFinanceSummary(transactions, year)
    const row = byEvent.value[0]!
    expect(row.count).toBe(1)
    expect(row.total).toBe(15)
    expect(row.gettoniCount).toBe(1)
    expect(row.gettoniTotal).toBe(7.5)
    expect(row.combinedTotal).toBe(22.5)
  })

  it('byFormat only reports a cost when every non-Comped transaction agrees on the amount', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_amount: 15, tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 2, payment_amount: 15, tournament: { uuid: 't1' } as never })
    ])
    const { byFormat } = useFinanceSummary(transactions, year)
    expect(byFormat.value.find(row => row.format === 'Pauper')?.cost).toBe(15)
  })

  it('byFormat reports no cost when non-Comped amounts disagree', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_amount: 15, tournament: { uuid: 't1' } as never }),
      makeTransaction({ id: 2, payment_amount: 20, tournament: { uuid: 't1' } as never })
    ])
    const { byFormat } = useFinanceSummary(transactions, year)
    expect(byFormat.value.find(row => row.format === 'Pauper')?.cost).toBeNull()
  })

  it('byCategory computes a per-gettone cost from total/quantity, not a uniform-amount check', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_type: 'Token Purchase', payment_amount: 7.5, event_name: '3 gettoni' })
    ])
    const { byCategory } = useFinanceSummary(transactions, year)
    const tokenRow = byCategory.value.find(row => row.type === 'tokenPurchase')!
    expect(tokenRow.quantity).toBe(3)
    expect(tokenRow.cost).toBe(2.5)
  })

  it('byCategory never computes a cost for donations', () => {
    const transactions = ref([makeTransaction({ id: 1, payment_type: 'Donation', payment_amount: 50 })])
    const { byCategory } = useFinanceSummary(transactions, year)
    expect(byCategory.value.find(row => row.type === 'donation')?.cost).toBeNull()
  })

  it('byType/grandTotal/grandCount sum every transaction regardless of format/tournament linkage', () => {
    const transactions = ref([
      makeTransaction({ id: 1, payment_type: 'Donation', payment_amount: 10 }),
      makeTransaction({ id: 2, payment_type: 'Association Fee', payment_amount: 25 })
    ])
    const { grandTotal, grandCount } = useFinanceSummary(transactions, year)
    expect(grandTotal.value).toBe(35)
    expect(grandCount.value).toBe(2)
  })

  it('byMethodCost applies the POS fee rate and computes net', () => {
    const transactions = ref([makeTransaction({ id: 1, payment_method: 'POS', payment_amount: 100 })])
    const { byMethodCost, totalFees, grandNet } = useFinanceSummary(transactions, year)
    const posRow = byMethodCost.value.find(row => row.method === 'POS')!
    expect(posRow.fee).toBeCloseTo(0.19)
    expect(posRow.net).toBeCloseTo(99.81)
    expect(totalFees.value).toBeCloseTo(0.19)
    expect(grandNet.value).toBeCloseTo(99.81)
  })

  it('byMonth backfills every month of the selected year, even with no transactions', () => {
    const { byMonth } = useFinanceSummary(ref([]), year)
    expect(byMonth.value).toHaveLength(12)
    expect(byMonth.value.every(row => row.grandTotal === 0)).toBe(true)
  })

  it('byMonth groups transactions by their payment month', () => {
    const transactions = ref([
      makeTransaction({
        id: 1, payment_amount: 10, payment_date: new Date(2026, 0, 5).toISOString()
      }),
      makeTransaction({
        id: 2, payment_amount: 20, payment_date: new Date(2026, 0, 20).toISOString()
      })
    ])
    const { byMonth } = useFinanceSummary(transactions, year)
    const january = byMonth.value.find(row => row.month === '2026-01')!
    expect(january.grandTotal).toBe(30)
  })
})
