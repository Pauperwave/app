// shared\types\transactions.ts

// Mirror pauperwave_payments' CHECK constraints (ck_payment_method, ck_payment_type)
export const PAYMENT_METHODS = ['Cash', 'PayPal', 'POS', 'Comped'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export const PAYMENT_TYPES = [
  'Association Fee', 'Donation', 'Event Fee', 'Tournament Fee', 'Token Purchase'
] as const
export type PaymentType = typeof PAYMENT_TYPES[number]

// Shared by transactions/list/AddModal.vue and server/api/transactions/create.post.ts (thin
// pass-through to Supabase). Either associateUuid or all three payer* fields are set
// (ck_payer_info): checked by AddModal.vue's schema and again server-side.
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
  // ck_payment_type_event_link: exactly one of these for Tournament Fee/Event Fee/Token Purchase,
  // neither for Association Fee/Donation
  tournamentUuid: string | null
  eventUuid: string | null
  // Historical-import free text, not editable in the form (use tournamentUuid/eventUuid). Passed
  // through unchanged on edit so gettoni-encoded historical rows (transactionGettoni.ts) keep their
  // data.
  eventName: string | null
  notes: string
}
