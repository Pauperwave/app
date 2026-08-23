// app\composables\finance\useFinanceSummary.ts
// Aggregates /finance's two summary tables (by month, by payment type) off
// the same 'transactions' Pinia Colada cache /transactions itself reads —
// no separate fetch, no separate source of truth.
import { eachMonthOfInterval, endOfYear, format, startOfYear } from 'date-fns'
import { it } from 'date-fns/locale'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '#shared/types/transactions'
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'
import type { Transaction } from '~/types'

export interface FinanceTypeSummaryRow {
  type: PaymentType
  count: number
  total: number
  average: number
  // Share of this table's own grand total, 0-1 — not app-wide grandTotal
  // (payment types other than 'Event'/'Tournament Fee' etc. all belong to
  // the same total here, so the two happen to coincide today, but this is
  // computed locally to avoid a circular dependency on the exported
  // grandTotal computed, which itself derives from byType).
  share: number
}

export interface FinanceMonthSummaryRow {
  month: string
  label: string
  totals: Record<PaymentType, number>
  grandTotal: number
}

export interface FinanceTournamentSummaryRow {
  uuid: string
  name: string
  stageNumber: number | null
  league: string | null
  leagueUuid: string | null
  format: string
  startDate: string
  count: number
  // Transactions paid via the 'Comped' method (payment_method, not
  // payment_type — a free/comped entry is still a Tournament Fee, just
  // waived) — a subset of `count`, not a separate transaction category.
  compedCount: number
  total: number
  average: number
}

export interface FinanceEventSummaryRow {
  uuid: string
  name: string
  startDate: string
  count: number
  total: number
  average: number
}

export interface FinanceFormatSummaryRow {
  format: string
  // Distinct tournaments, not transactions — a single tournament can have
  // several payments (multiple entry fees), so this differs from `count`.
  tournamentCount: number
  count: number
  total: number
  average: number
  share: number
}

export interface FinanceMethodCostRow {
  method: PaymentMethod
  count: number
  total: number
  // Share of this table's own grand total, 0-1 — same locally-scoped
  // reasoning as FinanceTypeSummaryRow/FinanceFormatSummaryRow's own share
  // (user request, 2026-08-23: "percentuale sul totale fra contanti, pos e
  // paypal").
  share: number
  feeRate: number
  fee: number
  net: number
}

export function useFinanceSummary(transactions: Ref<Transaction[]>, year: Ref<number>) {
  // Same 'tournaments' Pinia Colada key /tournaments and the transactions
  // table's own Evento column already read — stageNumber comes pre-computed
  // (assignTournamentStageNumbers), not re-derived here.
  const { data: tournamentsData } = useTournamentsQuery()
  const tournamentsByUuid = computed(() =>
    new Map((tournamentsData.value ?? []).map(tournament => [tournament.uuid, tournament])))

  // Same reasoning as tournamentsByUuid above, for byEvent's own startDate
  // column (user request, 2026-08-23 — the summary tables read "a bit bare"
  // with just name/count/total).
  const { data: eventsData } = useEventsQuery()
  const eventsByUuid = computed(() =>
    new Map((eventsData.value ?? []).map(event => [event.uuid, event])))

  // Only transactions actually linked to a tournament (tournament_uuid) count
  // here — a Tournament Fee payment whose FK match failed at import time
  // (see .scratch/import-transactions.mjs) has no tournament to attribute it
  // to and is excluded, same as the "Evento" column falling back to plain
  // text for those rows.
  const byTournament = computed<FinanceTournamentSummaryRow[]>(() => {
    const rows = new Map<string, FinanceTournamentSummaryRow>()
    for (const transaction of transactions.value) {
      const uuid = transaction.tournament?.uuid
      if (!uuid) continue
      const tournament = tournamentsByUuid.value.get(uuid)
      if (!tournament) continue
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
          total: 0,
          average: 0
        })
      }
      const row = rows.get(uuid)!
      row.count += 1
      if (transaction.payment_method === 'Comped') row.compedCount += 1
      row.total += transaction.payment_amount
    }
    for (const row of rows.values()) row.average = row.total / row.count
    return [...rows.values()].sort((a, b) => b.total - a.total)
  })

  // Same "only rows with a resolved FK count" rule as byTournament above —
  // event_name alone isn't enough to group by (gettoni rows reuse that field
  // for a coin count, filtered out the same way the transactions table's own
  // "Evento" column does, see parseGettoniCount), so this needs the real
  // event.uuid FK, not just non-empty text.
  const byEvent = computed<FinanceEventSummaryRow[]>(() => {
    const rows = new Map<string, FinanceEventSummaryRow>()
    for (const transaction of transactions.value) {
      const uuid = transaction.event?.uuid
      if (!uuid) continue
      if (parseGettoniCount(transaction.event_name) !== null) continue
      const event = eventsByUuid.value.get(uuid)
      if (!event) continue
      if (!rows.has(uuid)) {
        rows.set(uuid, {
          uuid, name: event.name, startDate: event.startDate, count: 0, total: 0, average: 0
        })
      }
      const row = rows.get(uuid)!
      row.count += 1
      row.total += transaction.payment_amount
    }
    for (const row of rows.values()) row.average = row.total / row.count
    return [...rows.values()].sort((a, b) => b.total - a.total)
  })

  const byFormat = computed<FinanceFormatSummaryRow[]>(() => {
    const rows = new Map<string, FinanceFormatSummaryRow>()
    for (const row of byTournament.value) {
      if (!rows.has(row.format)) {
        rows.set(row.format, {
          format: row.format, tournamentCount: 0, count: 0, total: 0, average: 0, share: 0
        })
      }
      const formatRow = rows.get(row.format)!
      formatRow.tournamentCount += 1
      formatRow.count += row.count
      formatRow.total += row.total
    }
    const grandTotal = [...rows.values()].reduce((sum, row) => sum + row.total, 0)
    for (const row of rows.values()) {
      row.average = row.count ? row.total / row.count : 0
      row.share = grandTotal ? row.total / grandTotal : 0
    }
    return [...rows.values()].sort((a, b) => b.total - a.total)
  })

  // Single pass building a Map keyed by type, same shape as byTournament/
  // byEvent/byFormat/byMonth above — was PAYMENT_TYPES.map() with a
  // .filter()+.reduce() per type (N full scans of transactions instead of
  // one), only worth fixing for consistency, not performance, at this
  // dataset size (user request, 2026-08-23).
  const byType = computed<FinanceTypeSummaryRow[]>(() => {
    const rows = new Map<PaymentType, FinanceTypeSummaryRow>(
      PAYMENT_TYPES.map(type => [type, { type, count: 0, total: 0, average: 0, share: 0 }])
    )
    for (const transaction of transactions.value) {
      const row = rows.get(transaction.payment_type)!
      row.count += 1
      row.total += transaction.payment_amount
    }
    const grandTotal = [...rows.values()].reduce((sum, row) => sum + row.total, 0)
    for (const row of rows.values()) {
      row.average = row.count ? row.total / row.count : 0
      row.share = grandTotal ? row.total / grandTotal : 0
    }
    return PAYMENT_TYPES.map(type => rows.get(type)!)
  })

  const grandTotal = computed(() => byType.value.reduce((sum, row) => sum + row.total, 0))
  const grandCount = computed(() => byType.value.reduce((sum, row) => sum + row.count, 0))

  // Same single-pass shape as byType above.
  const byMethodCost = computed<FinanceMethodCostRow[]>(() => {
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
    for (const transaction of transactions.value) {
      const row = rows.get(transaction.payment_method)!
      row.count += 1
      row.total += transaction.payment_amount
    }
    const grandTotal = [...rows.values()].reduce((sum, row) => sum + row.total, 0)
    for (const row of rows.values()) {
      row.share = grandTotal ? row.total / grandTotal : 0
      row.fee = row.total * row.feeRate
      row.net = row.total - row.fee
    }
    return PAYMENT_METHODS.map(method => rows.get(method)!)
  })

  const totalFees = computed(() => byMethodCost.value.reduce((sum, row) => sum + row.fee, 0))
  const grandNet = computed(() => grandTotal.value - totalFees.value)
  const grandAverage = computed(() => grandCount.value ? grandTotal.value / grandCount.value : 0)

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

  // "YYYY-MM" is both the sort key and the Map key — chronological order
  // falls out of a plain string sort, no separate Date parsing needed.
  // Backfilled across the whole selected `year` (user request, 2026-08-23,
  // extended 2026-08-24 to key off the year switcher rather than always
  // "the real current year") — a month with no transactions used to just
  // not appear, which read as a break in the monthly trend chart instead
  // of a real zero.
  const byMonth = computed<FinanceMonthSummaryRow[]>(() => {
    const rows = new Map<string, FinanceMonthSummaryRow>()
    for (const transaction of transactions.value) {
      const date = new Date(transaction.payment_date)
      const month = format(date, 'yyyy-MM')
      if (!rows.has(month)) rows.set(month, emptyMonthRow(date))
      const row = rows.get(month)!
      row.totals[transaction.payment_type] += transaction.payment_amount
      row.grandTotal += transaction.payment_amount
    }

    const yearAnchor = new Date(year.value, 0, 1)
    const interval = eachMonthOfInterval({
      start: startOfYear(yearAnchor), end: endOfYear(yearAnchor)
    })
    for (const date of interval) {
      const month = format(date, 'yyyy-MM')
      if (!rows.has(month)) rows.set(month, emptyMonthRow(date))
    }

    return [...rows.values()].sort((a, b) => a.month.localeCompare(b.month))
  })

  return {
    byType, byMonth, byTournament, byEvent, byFormat, byMethodCost,
    grandTotal, grandCount, totalFees, grandNet, grandAverage
  }
}
