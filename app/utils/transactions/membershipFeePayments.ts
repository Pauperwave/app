// app\utils\transactions\membershipFeePayments.ts

// Payments of this type renew a member's tesseramento, so creating, editing or deleting them (or
// moving a payment into or out of the type) needs 'manage-membership-fees' (admin), like the
// transactions endpoints enforce; every other type is routine organizer work.
export const MEMBERSHIP_FEE_PAYMENT_TYPE = 'Association Fee'

export function isMembershipFeePayment(paymentType: string | null | undefined): boolean {
  return paymentType === MEMBERSHIP_FEE_PAYMENT_TYPE
}
