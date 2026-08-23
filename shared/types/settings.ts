// shared\types\settings.ts
import type { PaymentMethod } from '#shared/types/transactions'

// Shared by app/composables/settings/useSettingsMutations.ts and
// server/api/settings/update-membership-fee.post.ts — same shape by
// construction (a thin pass-through to Supabase), same convention as
// shared/types/transactions.ts's NewTransactionPayload.
export interface UpdateMembershipFeePayload {
  membershipFeeAmount: number
  membershipFeePaymentMethod: PaymentMethod
}

// Shared by useSettingsMutations.ts and update-trash-retention.post.ts —
// same thin pass-through shape as UpdateMembershipFeePayload above.
export interface UpdateTrashRetentionPayload {
  trashRetentionDays: number
}
