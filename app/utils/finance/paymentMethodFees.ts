// app\utils\finance\paymentMethodFees.ts
import type { PaymentMethod } from '#shared/types/transactions'

// Processor commission per payment method, as a fraction of the amount (POS: 0,19%). Cash/Comped
// never carry one; PayPal's rate isn't tracked, so 0 there means "not modeled", not "free"
export const PAYMENT_METHOD_FEE_RATES: Record<PaymentMethod, number> = {
  Cash: 0,
  PayPal: 0,
  POS: 0.0019,
  Comped: 0
}
