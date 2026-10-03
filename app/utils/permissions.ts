// app\utils\permissions.ts
import type { AppRole } from '~/types'

// Roles are a strict hierarchy: each level is a superset of the one below
// (docs/architecture/roles.md §1)
export const ROLE_LEVEL = {
  player: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3
} as const satisfies Record<AppRole, number>

// Each permission declares the *minimum* role it needs, once, instead of every role above
// re-listing it (docs/architecture/roles.md "Suggested order of work" step 13).
// docs/architecture/permissions.md is the human-readable companion: add a row there whenever a
// Permission is added here.
export type Permission
  = | 'register-tournament'
    | 'manage-tournaments'
    | 'manage-event-payments'
    | 'reset-pairing'
    | 'send-payment-receipts'
    | 'manage-members'
    | 'manage-membership-fees'
    | 'manage-tournament-settings'
    | 'manage-all-commander-decks'
    | 'delete-tournaments'
    | 'cancel-round'
    | 'delete-commander-deck'
    | 'delete-ruleset'
    | 'manage-roles'
    // Nav-visibility permissions: gate whether a sidebar section/page is shown at all, distinct
    // from the action-level ones above (an organizer can see every associate but not edit/delete
    // them)
    | 'view-associates'
    | 'view-finance'
    | 'view-players'
    | 'manage-locations'
    | 'manage-rulesets'
    | 'access-settings'
    // Whole /trash page: viewing and restoring soft-deleted rows, both admin-only (see
    // docs/architecture/permissions.md "Note"); soft-deleting itself stays organizer+
    | 'view-trash'
    // Permanent deletion from /trash: one tier above view-trash's restore ("Eliminare
    // definitivamente" = super_admin)
    | 'purge-trash'
    // Marking a tournament as "test": hides it from everyone below super_admin (RLS), so nobody
    // else could undo it
    | 'mark-test-tournaments'

export const PERMISSION_LEVEL = {
  'register-tournament': 'player',
  'manage-tournaments': 'organizer',
  'manage-event-payments': 'organizer',
  'reset-pairing': 'organizer', // fix a mis-entered table's results — routine correction, not the same class as cancel-round
  'send-payment-receipts': 'admin', // event/tournament AND membership-fee receipts — organizer can manage the payment, not email the receipt
  'manage-members': 'admin',
  'manage-membership-fees': 'admin',
  'manage-tournament-settings': 'admin',
  'manage-all-commander-decks': 'admin',
  'delete-tournaments': 'super_admin', // permanent deletion only — create/edit stays 'organizer' above
  // Revised down to 'admin' (admin has every power except "Eliminare definitivamente"); ordinary
  // round management stays 'organizer' via 'manage-tournaments'. Also covers league's "turn back to
  // registration"
  'cancel-round': 'admin',
  // Revised down to 'admin'; distinct from 'manage-all-commander-decks' (edit/manage)
  'delete-commander-deck': 'admin',
  // Revised down to 'admin' (admin has every power except "Eliminare definitivamente")
  'delete-ruleset': 'admin',
  // 'admin' can grant player/organizer/admin, never super_admin, and can't touch a super_admin or
  // the protected developer account (`role_locked`). That finer boundary lives in the assign_role
  // RPC (migrations 20260823130000/20260823140000), which MembersList.vue's role dropdown calls
  // directly, so it holds regardless of the UI; this only gates the top tier
  'manage-roles': 'admin',
  'view-associates': 'organizer', // sees every associate's data; editing/deleting stays manage-members (admin)
  'view-finance': 'organizer',
  'view-players': 'organizer',
  'manage-locations': 'organizer',
  'manage-rulesets': 'organizer', // deleting a ruleset stays delete-ruleset (admin)
  // Whole /settings section (all four pages): only gates reachability of the page/nav item;
  // assigning a role has its own finer rules in the assign_role RPC
  'access-settings': 'admin',
  'view-trash': 'admin',
  'purge-trash': 'super_admin',
  'mark-test-tournaments': 'super_admin'
} as const satisfies Record<Permission, AppRole>

export function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
