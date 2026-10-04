// test\unit\utils\finance\summarizeTransactions.test.ts
import { describe, expect, it } from 'vitest'
import {
  summarizeByCategory,
  summarizeByEvent,
  summarizeByFormat,
  summarizeByMethodCost,
  summarizeByMonth,
  summarizeByTournament,
  summarizeByType
} from '~/utils/finance/summarizeTransactions'
import type { Event, Tournament, Transaction } from '~/types'

const tournament = (uuid: string, format: string, name = uuid) => ({
  uuid, name, format, stageNumber: null, league: null, leagueUuid: null, startDate: '2026-01-10'
}) as unknown as Tournament

const tournaments = new Map([
  ['t1', tournament('t1', 'Pauper')],
  ['t2', tournament('t2', 'Pauper')],
  ['t3', tournament('t3', 'Draft')]
])

const events = new Map([
  ['e1', { uuid: 'e1', name: 'Fest', startDate: '2026-05-30' } as Event],
  ['e2', { uuid: 'e2', name: 'Night', startDate: '2026-06-01' } as Event]
])

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    payment_type: 'Tournament Fee',
    payment_method: 'Cash',
    payment_amount: 10,
    payment_date: new Date(2026, 0, 15).toISOString(),
    tournament: null,
    event: null,
    event_name: null,
    ...overrides
  } as unknown as Transaction
}

const inTournament = (uuid: string, overrides: Partial<Transaction> = {}) =>
  transaction({ tournament: { uuid } as never, ...overrides })

describe('with no transactions', () => {
  it('gives empty tournament, event and format tables', () => {
    expect(summarizeByTournament([], tournaments)).toEqual([])
    expect(summarizeByEvent([], events)).toEqual([])
    expect(summarizeByFormat([], tournaments)).toEqual([])
  })

  it('gives a zero row for every type and method, with no NaN shares', () => {
    for (const row of summarizeByType([])) {
      expect(row).toMatchObject({ count: 0, total: 0, average: 0, share: 0 })
    }
    for (const row of summarizeByMethodCost([])) {
      expect(row).toMatchObject({ count: 0, total: 0, share: 0, fee: 0, net: 0 })
    }
  })

  it('gives the four fixed category rows, with no cost', () => {
    const rows = summarizeByCategory([], [])

    expect(rows.map(row => row.type)).toEqual([
      'associationFee', 'eventFee', 'tokenPurchase', 'donation'
    ])
    expect(rows.every(row => row.cost === null)).toBe(true)
  })
})

describe('summarizeByTournament', () => {
  it('sorts by total, the biggest first', () => {
    const rows = summarizeByTournament([
      inTournament('t1', { payment_amount: 10 }),
      inTournament('t2', { payment_amount: 50 }),
      inTournament('t3', { payment_amount: 30 })
    ], tournaments)

    expect(rows.map(row => row.uuid)).toEqual(['t2', 't3', 't1'])
  })
})

describe('summarizeByEvent', () => {
  it('ignores a transaction whose event is unknown or missing', () => {
    const rows = summarizeByEvent([
      transaction({ event: { uuid: 'gone' } as never }),
      transaction({ event: null })
    ], events)

    expect(rows).toEqual([])
  })

  it('sorts by the total including the gettoni, and averages without them', () => {
    const rows = summarizeByEvent([
      transaction({ payment_type: 'Event Fee', payment_amount: 10, event: { uuid: 'e1' } as never }),
      transaction({ payment_type: 'Event Fee', payment_amount: 20, event: { uuid: 'e1' } as never }),
      transaction({ payment_type: 'Token Purchase', payment_amount: 5, event: { uuid: 'e1' } as never }),
      transaction({ payment_type: 'Event Fee', payment_amount: 100, event: { uuid: 'e2' } as never })
    ], events)

    expect(rows.map(row => row.uuid)).toEqual(['e2', 'e1'])
    expect(rows[1]).toMatchObject({
      count: 2, total: 30, average: 15, gettoniTotal: 5, combinedTotal: 35
    })
  })

  it('has a zero average for an event with only gettoni', () => {
    const [row] = summarizeByEvent([
      transaction({ payment_type: 'Token Purchase', payment_amount: 5, event: { uuid: 'e1' } as never })
    ], events)

    expect(row).toMatchObject({ count: 0, average: 0, gettoniCount: 1 })
  })
})

describe('summarizeByFormat', () => {
  it('counts the distinct tournaments of a format and its share of the total', () => {
    const rows = summarizeByFormat([
      inTournament('t1', { payment_amount: 10 }),
      inTournament('t1', { payment_amount: 10 }),
      inTournament('t2', { payment_amount: 10 }),
      inTournament('t3', { payment_amount: 10 })
    ], tournaments)

    expect(rows.map(row => row.format)).toEqual(['Pauper', 'Draft'])
    expect(rows[0]).toMatchObject({ tournamentCount: 2, count: 3, total: 30, share: 0.75 })
    expect(rows[1]).toMatchObject({ tournamentCount: 1, share: 0.25 })
  })

  it('splits the totals by payment method', () => {
    const [row] = summarizeByFormat([
      inTournament('t1', { payment_method: 'PayPal', payment_amount: 5 }),
      inTournament('t1', { payment_method: 'Cash', payment_amount: 6 }),
      inTournament('t1', { payment_method: 'POS', payment_amount: 7 })
    ], tournaments)

    expect(row).toMatchObject({ paypalTotal: 5, cashTotal: 6, posTotal: 7, total: 18 })
  })

  it('costs 0 when every entry was comped', () => {
    const [row] = summarizeByFormat([
      inTournament('t1', { payment_method: 'Comped', payment_amount: 0 }),
      inTournament('t1', { payment_method: 'Comped', payment_amount: 0 })
    ], tournaments)

    expect(row!.cost).toBe(0)
  })

  it('does not let a comped entry break a uniform cost', () => {
    const [row] = summarizeByFormat([
      inTournament('t1', { payment_amount: 5 }),
      inTournament('t2', { payment_amount: 5 }),
      inTournament('t2', { payment_method: 'Comped', payment_amount: 0 })
    ], tournaments)

    expect(row!.cost).toBe(5)
  })
})

describe('summarizeByCategory', () => {
  it('puts the format rows between the association fee and the event fee', () => {
    const formats = summarizeByFormat([inTournament('t1'), inTournament('t3')], tournaments)

    const rows = summarizeByCategory([], formats)

    expect(rows.map(row => row.type)).toEqual([
      'associationFee', 'format', 'format', 'eventFee', 'tokenPurchase', 'donation'
    ])
  })

  it('sums the association fees and event fees on their own rows', () => {
    const rows = summarizeByCategory([
      transaction({ payment_type: 'Association Fee', payment_amount: 20 }),
      transaction({ payment_type: 'Association Fee', payment_amount: 20 }),
      transaction({ payment_type: 'Event Fee', payment_amount: 7 })
    ], [])

    expect(rows.find(row => row.type === 'associationFee')).toMatchObject({
      count: 2, total: 40, cost: 20
    })
    expect(rows.find(row => row.type === 'eventFee')).toMatchObject({ count: 1, total: 7, cost: 7 })
  })
})

describe('summarizeByType and summarizeByMethodCost', () => {
  it('shares each type of the grand total', () => {
    const rows = summarizeByType([
      transaction({ payment_type: 'Donation', payment_amount: 30 }),
      transaction({ payment_type: 'Event Fee', payment_amount: 10 })
    ])

    expect(rows.find(row => row.type === 'Donation')).toMatchObject({ total: 30, share: 0.75 })
    expect(rows.find(row => row.type === 'Event Fee')).toMatchObject({ total: 10, share: 0.25 })
  })

  it('takes the fee off the total to get the net', () => {
    const rows = summarizeByMethodCost([
      transaction({ payment_method: 'POS', payment_amount: 100 })
    ])
    const pos = rows.find(row => row.method === 'POS')!

    expect(pos.fee).toBeCloseTo(100 * pos.feeRate)
    expect(pos.net).toBeCloseTo(100 - pos.fee)
    expect(pos.share).toBe(1)
  })
})

describe('summarizeByMonth', () => {
  it('lists the twelve months of the year in order', () => {
    const rows = summarizeByMonth([], 2026)

    expect(rows.map(row => row.month)).toEqual(
      Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, '0')}`)
    )
    expect(rows.every(row => row.grandTotal === 0)).toBe(true)
  })

  it('keeps a transaction outside the selected year in its own month, in order', () => {
    const rows = summarizeByMonth([
      transaction({ payment_date: new Date(2025, 11, 20).toISOString(), payment_amount: 9 })
    ], 2026)

    expect(rows).toHaveLength(13)
    expect(rows[0]).toMatchObject({ month: '2025-12', grandTotal: 9 })
  })

  it('sums each type within its month', () => {
    const rows = summarizeByMonth([
      transaction({ payment_type: 'Donation', payment_amount: 4 }),
      transaction({ payment_type: 'Event Fee', payment_amount: 6 })
    ], 2026)

    expect(rows[0]).toMatchObject({ grandTotal: 10 })
    expect(rows[0]!.totals.Donation).toBe(4)
    expect(rows[0]!.totals['Event Fee']).toBe(6)
  })
})
