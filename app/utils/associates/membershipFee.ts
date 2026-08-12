// app\utils\associates\membershipFee.ts

// Association bylaw rule (not derived from any table — decided by the
// association's regolamento, currently unwritten anywhere in the app):
// membership (Association Fee) is always €5, first payment and every renewal
// alike, always via PayPal "Friends & Family". Extracted as named constants,
// not inlined in AddModal.vue, so the one place this rule is encoded is easy to
// find if/when it needs to change or move into a Settings-editable value (see
// docs/TODO.md).
export const MEMBERSHIP_FEE_AMOUNT = 5
export const MEMBERSHIP_FEE_PAYMENT_METHOD = 'PayPal' as const
