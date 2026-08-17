// app\utils\permissions.ts
import type { AppRole } from '~/types'

// Roles are a strict hierarchy, not independent capabilities — each level a
// strict superset of the one below (docs/architecture/roles.md §1).
export const ROLE_LEVEL = {
  player: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3
} as const satisfies Record<AppRole, number>

// Each permission declares the *minimum* role it needs, once — not every
// role above it re-listing it. Grows incrementally as each domain gets
// scoped (docs/architecture/roles.md's "Suggested order of work" step 13);
// docs/architecture/permissions.md is the human-readable companion table —
// add a row there whenever a Permission is added here, same source of
// truth in two formats.
export type Permission
  = | 'register-tournament'
    | 'manage-tournaments'
    | 'manage-event-payments'
    | 'reset-pairing'
    | 'send-payment-receipts'
    | 'manage-members'
    | 'manage-membership-fees'
    | 'manage-all-commander-decks'
    | 'delete-tournaments'
    | 'cancel-round'
    | 'delete-commander-deck'
    | 'delete-ruleset'
    | 'manage-roles'

export const PERMISSION_LEVEL = {
  'register-tournament': 'player',
  'manage-tournaments': 'organizer',
  'manage-event-payments': 'organizer',
  'reset-pairing': 'organizer', // fix a mis-entered table's results — routine correction, not the same class as cancel-round
  'send-payment-receipts': 'admin', // event/tournament AND membership-fee receipts — organizer can manage the payment, not email the receipt
  'manage-members': 'admin',
  'manage-membership-fees': 'admin',
  'manage-all-commander-decks': 'admin',
  'delete-tournaments': 'super_admin', // permanent deletion only — create/edit stays 'organizer' above
  'cancel-round': 'super_admin', // ordinary round management stays 'organizer', via 'manage-tournaments'; also covers league's "turn back to registration" case
  'delete-commander-deck': 'super_admin', // deleting someone else's deck — distinct from 'manage-all-commander-decks' (edit/manage, admin)
  'delete-ruleset': 'super_admin',
  'manage-roles': 'super_admin'
} as const satisfies Record<Permission, AppRole>

export function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
