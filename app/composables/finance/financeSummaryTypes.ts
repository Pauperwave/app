// app\composables\finance\financeSummaryTypes.ts
// Row shapes returned by useFinanceSummary.ts, split out 2026-09-17 once that
// file (mostly these types) had grown to 547 lines — imported directly by
// every finance/*SummaryTable.vue, *Chart.client.vue and *Overview.vue
// component, not just the composable itself.
import type { PaymentMethod, PaymentType } from '#shared/types/transactions'

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
