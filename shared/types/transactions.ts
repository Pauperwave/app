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
  eventUuid: string | null
  eventName: string | null
  notes: string
}
