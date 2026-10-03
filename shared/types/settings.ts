// shared\types\settings.ts
import type { PaymentMethod } from '#shared/types/transactions'

// Shared by useSettingsMutations.ts and update-membership-fee.post.ts (thin pass-through to
// Supabase).
export interface UpdateMembershipFeePayload {
  membershipFeeAmount: number
  membershipFeePaymentMethod: PaymentMethod
}

// Shared by useSettingsMutations.ts and update-trash-retention.post.ts.
export interface UpdateTrashRetentionPayload {
  trashRetentionDays: number
}

// Swiss round count by player count: the first tier whose `maxPlayers` covers
// the player count applies, `swissRoundCountBeyond` past the last tier.
export interface SwissRoundCountTier {
  maxPlayers: number
  rounds: number
}

// Shared by useSettingsMutations.ts and update-tournament-settings.post.ts.
export interface UpdateTournamentSettingsPayload {
  commanderRoundCount: number
  oneVsOneRoundCount: number
  swissRoundCountTiers: SwissRoundCountTier[]
  swissRoundCountBeyond: number
}

// Shared by useSettingsMutations.ts and update-timer-settings.post.ts: round durations plus
// the "pre" phase's setup-countdown length (useRoundTimerEngine.ts's PRE_TIMER_MINUTES).
export interface UpdateTimerSettingsPayload {
  commanderRoundMinutes: number
  oneVsOneRoundMinutes: number
  preRoundWaitMinutes: number
}

// /settings/members row: one per current organizer/admin/super_admin. 'player' is never stored
// as a user_roles row (assign_role deletes it), so a row existing already means "current staff".
// Shared by useMembersQuery.ts/useMembersMutations.ts and server/api/settings/members.get.ts.
export interface Member {
  userId: string
  associateUuid: string
  name: string
  role: 'player' | 'organizer' | 'admin' | 'super_admin'
  roleLocked: boolean
}

export type MemberRole = Member['role']
