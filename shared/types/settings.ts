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

// /settings/members (2026-08-25 user request: wire the template's mock
// roster to the real role system) — one row per current organizer/admin/
// super_admin, not every associate or every account-linked player: 'player'
// is never actually stored as a user_roles row (assign_role deletes it
// instead, migration 20260817100000), so a row existing at all already
// means "current staff". Shared by useMembersQuery.ts/useMembersMutations.ts
// and server/api/settings/members.get.ts, same convention as
// shared/types/players.ts's PlayerLastLogin.
export interface Member {
  userId: string
  associateUuid: string
  name: string
  role: 'player' | 'organizer' | 'admin' | 'super_admin'
  roleLocked: boolean
}

export type MemberRole = Member['role']
