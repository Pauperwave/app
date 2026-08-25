// shared\types\transactions.ts

// Mirrors pauperwave_payments' own CHECK constraints (ck_payment_method,
// ck_payment_type) — not free text, the DB rejects anything else.
export const PAYMENT_METHODS = ['Cash', 'PayPal', 'POS', 'Comped'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export const PAYMENT_TYPES = [
  'Association Fee', 'Donation', 'Event Fee', 'Tournament Fee', 'Token Purchase'
] as const
export type PaymentType = typeof PAYMENT_TYPES[number]

// Shared by app/components/transactions/list/AddModal.vue and
// server/api/transactions/create.post.ts — same shape by construction (a thin
// pass-through to Supabase), same convention as shared/types/wantedCards.ts.
// Either associateUuid is set, or all three payer* fields are (ck_payer_info) —
// enforced by AddModal.vue's schema, re-checked server-side since the client is
// not a trust boundary.
export interface NewTransactionPayload {
  associateUuid: string | null
  payerName: string | null
  payerSurname: string | null
  payerEmail: string | null
  payerTaxCode: string | null
  paymentDate: string
  paymentAmount: number
  paymentMethod: PaymentMethod
  paymentType: PaymentType
  receivedBy: string
  // Real FK links (2026-08-25 fix) — ck_payment_type_event_link (migration
  // 20260825220000) requires exactly one of these set for Tournament Fee/
  // Event Fee/Token Purchase, neither for Association Fee/Donation.
  tournamentUuid: string | null
  eventUuid: string | null
  // Historical-import free text (Importato... rows) — no longer editable via
  // the form (AddModal.vue/EditModal.vue), the real link is tournamentUuid/
  // eventUuid above. Passed through unchanged on edit rather than cleared,
  // so it doesn't wipe e.g. gettoni-encoded historical rows
  // (transactionGettoni.ts) that have no other record of that data.
  eventName: string | null
  notes: string
}
