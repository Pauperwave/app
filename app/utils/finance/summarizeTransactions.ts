// app\utils\finance\summarizeTransactions.ts
// The pure aggregations behind /finance's summary tables: each takes the year's transactions (and
// the tournaments/events to attribute them to) and returns one table's rows
import { eachMonthOfInterval, endOfYear, format, startOfYear } from 'date-fns'
import { it } from 'date-fns/locale'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'
import type { Event, Tournament, Transaction } from '~/types'
import type {
  FinanceCategoryRow,
  FinanceEventSummaryRow,
  FinanceFormatSummaryRow,
  FinanceMethodCostRow,
  FinanceMonthSummaryRow,
  FinanceTournamentSummaryRow,
  FinanceTypeSummaryRow
} from '~/composables/finance/financeSummaryTypes'

// Shared by byFormat's `cost` and byCategory's fixed-row aggregation. Strict uniformity, not "most
// frequent": gettoni are bought in variable quantities (2.50€ each, a purchase of 3 totals 7.50€),
// so no single amount is "the" price and a mode would pick whichever total repeated most. A cost
// shows only when every non-Comped transaction has the exact same amount. All-Comped (e.g.
// Premodern: 116 free entries) is an explicit 0€; only a category with no transactions is null.
function resolveCost(amountCounts: Map<number, number>, count: number): number | null {
  if (amountCounts.size === 1) return [...amountCounts.keys()][0]!
  if (amountCounts.size === 0) return count > 0 ? 0 : null
  return null
}

// Shared by byFormat/byType/byMethodCost: each builds a Map of rows keyed by a fixed dimension,
// then needs the sum of every row's total for a share-of-grand-total percentage
function computeGrandTotal(rows: Iterable<{ total: number }>): number {
  return [...rows].reduce((sum, row) => sum + row.total, 0)
}

// Shared by byTournament/byFormat: both only count transactions with a resolved tournament_uuid FK
// (see byTournament)
function resolveTournament(
  transaction: Transaction, tournamentsByUuid: Map<string, Tournament>
) {
  const uuid = transaction.tournament?.uuid
  if (!uuid) return null
  const tournament = tournamentsByUuid.get(uuid)
  if (!tournament) return null
  return { uuid, tournament }
}

interface PaymentMethodTotals {
  paypalTotal: number
  cashTotal: number
  posTotal: number
}

// Shared by aggregateCategoryTransactions/byFormat: both accumulate the same three payment-method
// sub-totals per transaction
function addPaymentMethodTotal(totals: PaymentMethodTotals, transaction: Transaction) {
  if (transaction.payment_method === 'PayPal') totals.paypalTotal += transaction.payment_amount
  if (transaction.payment_method === 'Cash') totals.cashTotal += transaction.payment_amount
  if (transaction.payment_method === 'POS') totals.posTotal += transaction.payment_amount
}

interface CategoryAggregate {
  count: number
  cost: number | null
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
}

// Shared by byCategory's associationFee/eventFee/tokenPurchase/donation rows: a plain "sum this
// list" pass without format/event grouping (byFormat's result is reused for the 'format' rows).
// `computeCost=false` for donation (no sticker price)
function aggregateCategoryTransactions(
  categoryTransactions: Transaction[], computeCost = true
): CategoryAggregate {
  let count = 0
  let total = 0
  const totals: PaymentMethodTotals = { paypalTotal: 0, cashTotal: 0, posTotal: 0 }
  const amountCounts = new Map<number, number>()

  for (const transaction of categoryTransactions) {
    count += 1
    total += transaction.payment_amount
    addPaymentMethodTotal(totals, transaction)
    if (computeCost && transaction.payment_method !== 'Comped') {
      countAmount(amountCounts, transaction.payment_amount)
    }
  }

  return {
    count, ...totals, total,
    cost: computeCost ? resolveCost(amountCounts, count) : null
  }
}

// Only transactions linked to a tournament (tournament_uuid) count: a Tournament Fee whose FK match
// failed at import has nothing to attribute it to and is excluded, like the "Evento" column falling
// back to plain text
export function summarizeByTournament(
  transactions: Transaction[], tournamentsByUuid: Map<string, Tournament>
): FinanceTournamentSummaryRow[] {
  const rows = new Map<string, FinanceTournamentSummaryRow>()
  for (const transaction of transactions) {
    const resolved = resolveTournament(transaction, tournamentsByUuid)
    if (!resolved) continue
    const { uuid, tournament } = resolved
    if (!rows.has(uuid)) {
      rows.set(uuid, {
        uuid,
        name: tournament.name,
        stageNumber: tournament.stageNumber,
        league: tournament.league,
        leagueUuid: tournament.leagueUuid,
        format: tournament.format,
        startDate: tournament.startDate,
        count: 0,
        compedCount: 0,
        cashTotal: 0,
        posTotal: 0,
        total: 0,
        average: 0
      })
    }
    const row = rows.get(uuid)!
    row.count += 1
    if (transaction.payment_method === 'Comped') row.compedCount += 1
    if (transaction.payment_method === 'Cash') row.cashTotal += transaction.payment_amount
    if (transaction.payment_method === 'POS') row.posTotal += transaction.payment_amount
    row.total += transaction.payment_amount
  }
  for (const row of rows.values()) row.average = row.total / row.count
  return [...rows.values()].sort((a, b) => b.total - a.total)
}

// Same "only rows with a resolved FK count" rule as byTournament: event_name alone can't group
// (gettoni rows reuse it for a coin count, see parseGettoniCount), so this needs the real
// event.uuid. 'Token Purchase' rows still belong to their event's row (rolled into
// gettoniCount/gettoniTotal, not count/total, see FinanceEventSummaryRow)
export function summarizeByEvent(
  transactions: Transaction[], eventsByUuid: Map<string, Event>
): FinanceEventSummaryRow[] {
  const rows = new Map<string, FinanceEventSummaryRow>()
  for (const transaction of transactions) {
    const uuid = transaction.event?.uuid
    if (!uuid) continue
    const event = eventsByUuid.get(uuid)
    if (!event) continue
    if (!rows.has(uuid)) {
      rows.set(uuid, {
        uuid,
        name: event.name,
        startDate: event.startDate,
        count: 0,
        total: 0,
        average: 0,
        gettoniCount: 0,
        gettoniTotal: 0,
        combinedTotal: 0
      })
    }
    const row = rows.get(uuid)!
    if (transaction.payment_type === 'Token Purchase') {
      row.gettoniCount += 1
      row.gettoniTotal += transaction.payment_amount
    } else {
      row.count += 1
      row.total += transaction.payment_amount
    }
  }
  for (const row of rows.values()) {
    row.average = row.count ? row.total / row.count : 0
    row.combinedTotal = row.total + row.gettoniTotal
  }
  return [...rows.values()].sort((a, b) => b.combinedTotal - a.combinedTotal)
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  const existing = map.get(key)
  if (existing !== undefined) return existing
  const created = create()
  map.set(key, created)
  return created
}

function countAmount(amountCounts: Map<number, number>, amount: number) {
  amountCounts.set(amount, (amountCounts.get(amount) ?? 0) + 1)
}

function emptyFormatRow(format: string): FinanceFormatSummaryRow {
  return {
    format,
    tournamentCount: 0,
    count: 0,
    paypalTotal: 0,
    cashTotal: 0,
    posTotal: 0,
    total: 0,
    average: 0,
    share: 0,
    cost: null
  }
}

// Direct pass over the transactions, not over summarizeByTournament's rows: `cost` needs each
// payment_amount across every tournament of a format, which per-tournament sums don't preserve.
// Same "resolved tournament FK" filter as byTournament
export function summarizeByFormat(
  transactions: Transaction[], tournamentsByUuid: Map<string, Tournament>
): FinanceFormatSummaryRow[] {
  const rows = new Map<string, FinanceFormatSummaryRow>()
  const tournamentUuidsByFormat = new Map<string, Set<string>>()
  const amountCountsByFormat = new Map<string, Map<number, number>>()

  for (const transaction of transactions) {
    const resolved = resolveTournament(transaction, tournamentsByUuid)
    if (!resolved) continue
    const { uuid, tournament } = resolved
    const { format } = tournament

    const row = getOrCreate(rows, format, () => emptyFormatRow(format))
    row.count += 1
    row.total += transaction.payment_amount
    addPaymentMethodTotal(row, transaction)

    getOrCreate(tournamentUuidsByFormat, format, () => new Set<string>()).add(uuid)

    if (transaction.payment_method !== 'Comped') {
      countAmount(
        getOrCreate(amountCountsByFormat, format, () => new Map<number, number>()),
        transaction.payment_amount
      )
    }
  }

  const grandTotal = computeGrandTotal(rows.values())
  for (const row of rows.values()) {
    row.tournamentCount = tournamentUuidsByFormat.get(row.format)?.size ?? 0
    row.average = row.count ? row.total / row.count : 0
    row.share = grandTotal ? row.total / grandTotal : 0
    row.cost = resolveCost(amountCountsByFormat.get(row.format) ?? new Map(), row.count)
  }
  return [...rows.values()].sort((a, b) => b.total - a.total)
}

// The page's opening summary table (see FinanceCategoryType for why it is scalable). 'donation'
// passes computeCost=false (no sticker price); every other row's cost needs all non-Comped
// transactions to share one amount, except 'tokenPurchase', overridden below to total/quantity
// (see FinanceCategoryRow's `quantity`). The 'format' rows are the by-format summary's
export function summarizeByCategory(
  transactions: Transaction[], formatRows: FinanceFormatSummaryRow[]
): FinanceCategoryRow[] {
  const associationFee = aggregateCategoryTransactions(
    transactions.filter(transaction => transaction.payment_type === 'Association Fee')
  )
  const eventFee = aggregateCategoryTransactions(
    transactions.filter(transaction => transaction.payment_type === 'Event Fee')
  )
  const tokenPurchaseTransactions = transactions.filter(
    transaction => transaction.payment_type === 'Token Purchase'
  )
  const tokenPurchase = aggregateCategoryTransactions(tokenPurchaseTransactions)
  const gettoniQuantity = tokenPurchaseTransactions.reduce(
    (sum, transaction) => sum + (parseGettoniCount(transaction.event_name) ?? 0), 0
  )
  const donation = aggregateCategoryTransactions(
    transactions.filter(transaction => transaction.payment_type === 'Donation'), false
  )

  return [
    { type: 'associationFee' as const, quantity: null, ...associationFee },
    ...formatRows.map(row => ({
      type: 'format' as const,
      format: row.format,
      quantity: null,
      count: row.count,
      cost: row.cost,
      paypalTotal: row.paypalTotal,
      cashTotal: row.cashTotal,
      posTotal: row.posTotal,
      total: row.total
    })),
    { type: 'eventFee' as const, quantity: null, ...eventFee },
    {
      type: 'tokenPurchase' as const,
      quantity: gettoniQuantity,
      ...tokenPurchase,
      cost: gettoniQuantity > 0 ? tokenPurchase.total / gettoniQuantity : tokenPurchase.cost
    },
    { type: 'donation' as const, quantity: null, ...donation }
  ]
}

// Single pass building a Map keyed by type, like the by-tournament/event/format/month summaries
// (consistency, not performance)
export function summarizeByType(transactions: Transaction[]): FinanceTypeSummaryRow[] {
  const rows = new Map<PaymentType, FinanceTypeSummaryRow>(
    PAYMENT_TYPES.map(type => [type, { type, count: 0, total: 0, average: 0, share: 0 }])
  )
  for (const transaction of transactions) {
    const row = rows.get(transaction.payment_type)!
    row.count += 1
    row.total += transaction.payment_amount
  }
  const grandTotal = computeGrandTotal(rows.values())
  for (const row of rows.values()) {
    row.average = row.count ? row.total / row.count : 0
    row.share = grandTotal ? row.total / grandTotal : 0
  }
  return PAYMENT_TYPES.map(type => rows.get(type)!)
}

// Same single-pass shape as summarizeByType
export function summarizeByMethodCost(transactions: Transaction[]): FinanceMethodCostRow[] {
  const rows = new Map<PaymentMethod, FinanceMethodCostRow>(
    PAYMENT_METHODS.map(method => [method, {
      method,
      count: 0,
      total: 0,
      share: 0,
      feeRate: PAYMENT_METHOD_FEE_RATES[method],
      fee: 0,
      net: 0
    }])
  )
  for (const transaction of transactions) {
    const row = rows.get(transaction.payment_method)!
    row.count += 1
    row.total += transaction.payment_amount
  }
  const grandTotal = computeGrandTotal(rows.values())
  for (const row of rows.values()) {
    row.share = grandTotal ? row.total / grandTotal : 0
    row.fee = row.total * row.feeRate
    row.net = row.total - row.fee
  }
  return PAYMENT_METHODS.map(method => rows.get(method)!)
}

function emptyMonthRow(date: Date): FinanceMonthSummaryRow {
  return {
    month: format(date, 'yyyy-MM'),
    label: format(date, 'MMMM yyyy', { locale: it }),
    totals: Object.fromEntries(
      PAYMENT_TYPES.map(type => [type, 0])
    ) as Record<PaymentType, number>,
    grandTotal: 0
  }
}

// "YYYY-MM" is both the sort key and the Map key (chronological order falls out of a string sort).
// Backfilled across the whole selected `year`, since a month with no transactions would otherwise
// read as a break in the trend chart
export function summarizeByMonth(
  transactions: Transaction[], year: number
): FinanceMonthSummaryRow[] {
  const rows = new Map<string, FinanceMonthSummaryRow>()
  for (const transaction of transactions) {
    const date = new Date(transaction.payment_date)
    const month = format(date, 'yyyy-MM')
    if (!rows.has(month)) rows.set(month, emptyMonthRow(date))
    const row = rows.get(month)!
    row.totals[transaction.payment_type] += transaction.payment_amount
    row.grandTotal += transaction.payment_amount
  }

  const yearAnchor = new Date(year, 0, 1)
  const interval = eachMonthOfInterval({
    start: startOfYear(yearAnchor), end: endOfYear(yearAnchor)
  })
  for (const date of interval) {
    const month = format(date, 'yyyy-MM')
    if (!rows.has(month)) rows.set(month, emptyMonthRow(date))
  }

  return [...rows.values()].sort((a, b) => a.month.localeCompare(b.month))
}
