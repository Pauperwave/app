// app\composables\finance\financeSummaryTypes.ts
// Row shapes returned by useFinanceSummary.ts, imported by every finance/*SummaryTable.vue,
// *Chart.client.vue and *Overview.vue
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'

export interface FinanceTypeSummaryRow {
  type: PaymentType
  count: number
  total: number
  average: number
  // Share of this table's own grand total, 0-1: computed locally to avoid a circular dependency on
  // the exported grandTotal (which derives from byType)
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
  // Transactions paid via 'Comped' (payment_method, not payment_type: a waived Tournament Fee is
  // still a Tournament Fee): a subset of `count`
  compedCount: number
  // Sum of payment_amount for 'Cash'/'POS' transactions: subsets of `total`, rolled up into
  // FinanceFormatSummaryRow's cashTotal/posTotal
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
  // 'Token Purchase' transactions linked to this event (event_uuid): gettoni are sold alongside it
  // on the same day, so their revenue counts toward the event's take though they are a distinct
  // payment_type from 'Event Fee'
  gettoniCount: number
  gettoniTotal: number
  // total + gettoniTotal
  combinedTotal: number
}

export interface FinanceFormatSummaryRow {
  format: string
  // Distinct tournaments, not transactions: one tournament can have several payments, so this
  // differs from `count`
  tournamentCount: number
  count: number
  // Sum of the underlying transactions' paypalTotal/cashTotal/posTotal.
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
  average: number
  share: number
  // Most common payment_amount among this format's non-Comped transactions (see byCategory's
  // "sticker price" reasoning, reused by its format rows)
  cost: number | null
}

// The page's opening summary table. Scalable on purpose, no hardcoded tournament/event names:
// `associationFee`/`eventFee`/ `tokenPurchase`/`donation` are fixed payment_type buckets, while
// tournament-format rows come from byFormat (one per format with a tournament this year), so a new
// mtg_format needs no code change. "Tutti gli eventi" stays one combined bucket (byEvent below is
// the per-event view).
export type FinanceCategoryType = 'associationFee' | 'format' | 'eventFee' | 'tokenPurchase' | 'donation'

export interface FinanceCategoryRow {
  type: FinanceCategoryType
  // Only set when type === 'format': the format name (Pauper, Commander, ...), both this row's
  // label (via FormatBadge) and its byFormat lookup key
  format?: string
  count: number
  // Only set (non-null) when type === 'tokenPurchase': gettoni are bought in variable quantities
  // (parsed from event_name, see parseGettoniCount), so `count` (purchases) doesn't say how many
  // tokens were sold
  quantity: number | null
  // See FinanceFormatSummaryRow's `cost`. For 'tokenPurchase' it is total/quantity (the real
  // per-gettone price), computed in byCategory: resolveCost looks at per-transaction amounts, which
  // vary with quantity, and would never find a uniform one
  cost: number | null
  paypalTotal: number
  cashTotal: number
  posTotal: number
  total: number
}

// Every fixed (non-format) row maps 1:1 onto a PaymentType, so its badge is just PaymentTypeBadge,
// with no separate label/icon config
export const FINANCE_CATEGORY_PAYMENT_TYPE: Record<Exclude<FinanceCategoryType, 'format'>, PaymentType> = {
  associationFee: 'Association Fee',
  eventFee: 'Event Fee',
  tokenPurchase: 'Token Purchase',
  donation: 'Donation'
}

export interface FinanceMethodCostRow {
  method: PaymentMethod
  count: number
  total: number
  // Share of this table's own grand total, 0-1: locally scoped like
  // FinanceTypeSummaryRow/FinanceFormatSummaryRow's share
  share: number
  feeRate: number
  fee: number
  net: number
}
