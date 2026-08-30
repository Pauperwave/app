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
    // Nav-visibility permissions (2026-08-17, step 12/13): gate whether a
    // sidebar section/page is shown at all, distinct from action-level
    // permissions above (e.g. view-associates vs. manage-members — an
    // organizer can see every associate's data but not edit/delete it).
    | 'view-associates'
    | 'view-finance'
    | 'view-players'
    | 'manage-locations'
    | 'manage-rulesets'
    | 'access-settings'
    // Whole /trash page (2026-08-22): viewing soft-deleted rows and restoring
    // them, both admin-only — see docs/architecture/permissions.md's "Note"
    // section on the soft-delete-vs-purge open question this resolves for
    // restore specifically (soft-deleting itself stays organizer+, unchanged).
    | 'view-trash'
    // Permanent deletion from /trash (2026-08-23) — one tier above
    // view-trash's restore, matching the existing "Eliminare
    // definitivamente" = super_admin rows in the permissions matrix.
    | 'purge-trash'

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
  // Revised down to 'admin' 2026-08-23 (user request: admin gets every
  // power except "Eliminare definitivamente") — ordinary round management
  // stays 'organizer', via 'manage-tournaments'; also covers league's "turn
  // back to registration" case.
  'cancel-round': 'admin',
  // Revised down to 'admin' 2026-08-23, same request — distinct from
  // 'manage-all-commander-decks' (edit/manage, already 'admin' above).
  'delete-commander-deck': 'admin',
  // Revised down to 'admin' 2026-08-23, same request.
  'delete-ruleset': 'admin',
  // 'admin' (not 'super_admin' only — user request 2026-08-23): admin can
  // grant player/organizer/admin, but never super_admin, and can never
  // touch an existing super_admin or the protected developer account
  // (`role_locked` flag, `user_roles`). That finer-grained boundary lives
  // in the assign_role RPC (migration 20260823130000/20260823140000), not
  // this constant — this only gates the top-level tier, not the two
  // exceptions. Enforced twice, not just once: MembersList.vue's role
  // dropdown calls assign_role directly (wired 2026-08-25), which
  // self-guards the exceptions server-side regardless of what the UI does.
  'manage-roles': 'admin',
  'view-associates': 'organizer', // sees every associate's data; editing/deleting stays manage-members (admin)
  'view-finance': 'organizer',
  'view-players': 'organizer',
  'manage-locations': 'organizer',
  'manage-rulesets': 'organizer', // deleting a ruleset stays delete-ruleset (admin)
  // Whole /settings section, all four pages uniformly (2026-08-17, revised
  // down from organizer): actually assigning a role has its own finer-grained
  // rules enforced at the assign_role RPC itself regardless of this — this
  // only gates whether the page/nav item is reachable at all.
  'access-settings': 'admin',
  'view-trash': 'admin',
  'purge-trash': 'super_admin'
} as const satisfies Record<Permission, AppRole>

export function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
