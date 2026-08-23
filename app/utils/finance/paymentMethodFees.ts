// app\utils\finance\paymentMethodFees.ts
import type { PaymentMethod } from '#shared/types/transactions'

// Processor commission per payment method, as a fraction of the transaction
// amount (user request, 2026-08-23: "sul POS paghiamo 0,19% di commissione").
// Cash/Comped never carry a processor fee; PayPal's own commission isn't
// tracked yet (unknown rate) — 0 here means "not modeled", not "free".
export const PAYMENT_METHOD_FEE_RATES: Record<PaymentMethod, number> = {
  Cash: 0,
  PayPal: 0,
  POS: 0.0019,
  Comped: 0
}
