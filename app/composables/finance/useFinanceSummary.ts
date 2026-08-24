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
  // Sum of payment_amount for transactions paid via 'Cash'/'POS' respectively
  // — subsets of `total`, mirroring compedCount above, rolled up into
  // FinanceFormatSummaryRow's own cashTotal/posTotal (user request,
  // 2026-08-24: add Contanti/Pos columns to the byFormat table).
  cashTotal: number
  posTotal: number
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
  // 'Token Purchase' transactions linked to this event (event_uuid) via the
  // gettoni stand run alongside it — sold on the same day, so their revenue
  // belongs to the event's own take even though they're a distinct
  // payment_type from 'Event Fee' (user request, 2026-08-24: Commanderwave
  // Fest's gettoni sales should count towards the event's total).
  gettoniCount: number
  gettoniTotal: number
  // total + gettoniTotal
  combinedTotal: number
}

export interface FinanceFormatSummaryRow {
  format: string
  // Distinct tournaments, not transactions — a single tournament can have
  // several payments (multiple entry fees), so this differs from `count`.
  tournamentCount: number
  count: number
  // Sum of the underlying transactions' paypalTotal/cashTotal/posTotal.
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
  average: number
  share: number
  // Most common payment_amount among this format's non-Comped transactions
  // — see byCategory's own comment for the full "sticker price" reasoning
  // (reused as-is by byCategory's own format rows, added here 2026-08-24 so
  // that reuse is literal, not a re-derivation).
  cost: number | null
}

// The page's opening summary table (user request, 2026-08-24) — scalable on
// purpose, no hardcoded tournament/event names: `associationFee`/`eventFee`/
// `tokenPurchase`/`donation` are fixed payment_type buckets, but the
// tournament-format rows come straight from byFormat below (one row per
// format that actually has a tournament this year) — a new mtg_format never
// needs a code change here, it just shows up. "Tutti gli eventi" deliberately
// stays one combined bucket across every named event rather than a row per
// event (which is what byEvent below is already for) — same reasoning that
// killed the earlier hardcoded "Commanderfest"/"Draft Speciale" rows.
export type FinanceCategoryType = 'associationFee' | 'format' | 'eventFee' | 'tokenPurchase' | 'donation'

export interface FinanceCategoryRow {
  type: FinanceCategoryType
  // Only set when type === 'format' — the tournament format name (Pauper,
  // Commander, ...), both this row's label (via FormatBadge) and its
  // byFormat lookup key.
  format?: string
  count: number
  // Only set (non-null) when type === 'tokenPurchase' — gettoni are bought
  // in variable quantities per transaction (parsed from event_name, see
  // parseGettoniCount), so `count` alone (purchases made) doesn't say how
  // many tokens were actually sold. Every other row has no separate
  // "quantity" concept from its own transaction count (user request,
  // 2026-08-24).
  quantity: number | null
  // See FinanceFormatSummaryRow's own `cost` comment. For 'tokenPurchase'
  // specifically this is total/quantity (the real per-gettone price),
  // computed in byCategory rather than via resolveCost — resolveCost looks
  // at the per-transaction amount, which varies with quantity purchased, so
  // it would (correctly) never find a single uniform amount here.
  cost: number | null
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
}

// Every fixed (non-format) row maps 1:1 onto an existing PaymentType, so its
// badge is just PaymentTypeBadge — no separate label/icon config to maintain
// here (2026-08-24, replacing an earlier hand-rolled UBadge fallback that
// existed only because the old rows didn't line up with a PaymentType 1:1).
export const FINANCE_CATEGORY_PAYMENT_TYPE: Record<Exclude<FinanceCategoryType, 'format'>, PaymentType> = {
  associationFee: 'Association Fee',
  eventFee: 'Event Fee',
  tokenPurchase: 'Token Purchase',
  donation: 'Donation'
}

// Shared by byFormat's own `cost` and byCategory's fixed-row aggregation
// below. Strict uniformity, not "most frequent" — a mode picked a plausible-
// looking but wrong number for 'Token Purchase' (gettoni are bought in
// variable quantities per transaction — 2.50€/gettone, but a purchase of 3
// totals 7.50€, so no single amount is "the" price; mode would just pick
// whichever total happened to repeat most, which isn't the per-gettone cost)
// — only show a cost when every non-Comped transaction agrees on the exact
// same amount (user request, 2026-08-24: "mettilo solo se è sempre uguale in
// tutte le tabelle"). All-Comped (e.g. Premodern: 116 free entries, 0 paid)
// is still an explicit 0€, not "unknown" — only a genuinely empty category
// (no transactions at all) stays null.
function resolveCost(amountCounts: Map<number, number>, count: number): number | null {
  if (amountCounts.size === 1) return [...amountCounts.keys()][0]!
  if (amountCounts.size === 0) return count > 0 ? 0 : null
  return null
}

interface CategoryAggregate {
  count: number
  cost: number | null
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
}

// Shared by byCategory's associationFee/eventFee/tokenPurchase/donation rows
// — a plain "sum this list of transactions" pass, no format/event grouping
// (that's byFormat's job, reused verbatim for the 'format' rows instead of
// re-aggregating here). `computeCost=false` for donation — see byCategory's
// own comment on why a donation has no sticker price.
function aggregateCategoryTransactions(
  categoryTransactions: Transaction[], computeCost = true
): CategoryAggregate {
  let count = 0
  let paypalTotal = 0
  let cashTotal = 0
  let posTotal = 0
  let total = 0
  const amountCounts = new Map<number, number>()

  for (const transaction of categoryTransactions) {
    count += 1
    total += transaction.payment_amount
    if (transaction.payment_method === 'PayPal') paypalTotal += transaction.payment_amount
    if (transaction.payment_method === 'Cash') cashTotal += transaction.payment_amount
    if (transaction.payment_method === 'POS') posTotal += transaction.payment_amount
    if (computeCost && transaction.payment_method !== 'Comped') {
      const amount = transaction.payment_amount
      amountCounts.set(amount, (amountCounts.get(amount) ?? 0) + 1)
    }
  }

  return {
    count, paypalTotal, cashTotal, posTotal, total,
    cost: computeCost ? resolveCost(amountCounts, count) : null
  }
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
  })

  // Same "only rows with a resolved FK count" rule as byTournament above —
  // event_name alone isn't enough to group by (gettoni rows reuse that field
  // for a coin count instead of the event's real name, see
  // parseGettoniCount), so this needs the real event.uuid FK, not just
  // non-empty text. 'Token Purchase' rows still belong to their event's own
  // row (rolled into gettoniCount/gettoniTotal, not count/total — see
  // FinanceEventSummaryRow), rather than being dropped entirely.
  const byEvent = computed<FinanceEventSummaryRow[]>(() => {
    const rows = new Map<string, FinanceEventSummaryRow>()
    for (const transaction of transactions.value) {
      const uuid = transaction.event?.uuid
      if (!uuid) continue
      const event = eventsByUuid.value.get(uuid)
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
  })

  // Direct pass over transactions.value (not byTournament.value) — computing
  // `cost` needs the individual payment_amount per transaction across every
  // tournament of a format, which byTournament's own per-tournament sums
  // don't preserve. Same "only rows with a resolved tournament FK" filter as
  // byTournament above, so the two stay numerically consistent.
  const byFormat = computed<FinanceFormatSummaryRow[]>(() => {
    const rows = new Map<string, FinanceFormatSummaryRow>()
    const tournamentUuidsByFormat = new Map<string, Set<string>>()
    const amountCountsByFormat = new Map<string, Map<number, number>>()

    for (const transaction of transactions.value) {
      const uuid = transaction.tournament?.uuid
      if (!uuid) continue
      const tournament = tournamentsByUuid.value.get(uuid)
      if (!tournament) continue
      const { format } = tournament

      if (!rows.has(format)) {
        rows.set(format, {
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
        })
      }
      const row = rows.get(format)!
      row.count += 1
      row.total += transaction.payment_amount
      if (transaction.payment_method === 'PayPal') row.paypalTotal += transaction.payment_amount
      if (transaction.payment_method === 'Cash') row.cashTotal += transaction.payment_amount
      if (transaction.payment_method === 'POS') row.posTotal += transaction.payment_amount

      if (!tournamentUuidsByFormat.has(format)) tournamentUuidsByFormat.set(format, new Set())
      tournamentUuidsByFormat.get(format)!.add(uuid)

      if (transaction.payment_method !== 'Comped') {
        if (!amountCountsByFormat.has(format)) amountCountsByFormat.set(format, new Map())
        const amountCounts = amountCountsByFormat.get(format)!
        const amount = transaction.payment_amount
        amountCounts.set(amount, (amountCounts.get(amount) ?? 0) + 1)
      }
    }

    const grandTotal = [...rows.values()].reduce((sum, row) => sum + row.total, 0)
    for (const row of rows.values()) {
      row.tournamentCount = tournamentUuidsByFormat.get(row.format)?.size ?? 0
      row.average = row.count ? row.total / row.count : 0
      row.share = grandTotal ? row.total / grandTotal : 0
      row.cost = resolveCost(amountCountsByFormat.get(row.format) ?? new Map(), row.count)
    }
    return [...rows.values()].sort((a, b) => b.total - a.total)
  })

  // The page's opening summary table (user request, 2026-08-24) — see
  // FinanceCategoryType's own comment for why this is scalable rather than a
  // fixed list of named tournaments/events. 'donation' passes
  // computeCost=false to aggregateCategoryTransactions — no sticker price by
  // nature ("Donazioni non ha un costo fisso"). Every other row's cost
  // requires every non-Comped transaction to agree on the exact same amount
  // ("mettilo solo se è sempre uguale in tutte le tabelle") — except
  // 'tokenPurchase', overridden below to total/quantity instead (see
  // FinanceCategoryRow's own `quantity` comment for why).
  const byCategory = computed<FinanceCategoryRow[]>(() => {
    const associationFee = aggregateCategoryTransactions(
      transactions.value.filter(transaction => transaction.payment_type === 'Association Fee')
    )
    const eventFee = aggregateCategoryTransactions(
      transactions.value.filter(transaction => transaction.payment_type === 'Event Fee')
    )
    const tokenPurchaseTransactions = transactions.value.filter(
      transaction => transaction.payment_type === 'Token Purchase'
    )
    const tokenPurchase = aggregateCategoryTransactions(tokenPurchaseTransactions)
    const gettoniQuantity = tokenPurchaseTransactions.reduce(
      (sum, transaction) => sum + (parseGettoniCount(transaction.event_name) ?? 0), 0
    )
    const donation = aggregateCategoryTransactions(
      transactions.value.filter(transaction => transaction.payment_type === 'Donation'), false
    )

    return [
      { type: 'associationFee' as const, quantity: null, ...associationFee },
      ...byFormat.value.map(row => ({
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
    byType, byMonth, byTournament, byEvent, byFormat, byCategory, byMethodCost,
    grandTotal, grandCount, totalFees, grandNet, grandAverage
  }
}
