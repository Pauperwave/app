# Roles and permissions

<!-- docs/architecture/roles.md -->

How players get a different (restricted, adapted) view of the same app the admin/organizer staff uses, instead of a separate player app or a separate route tree.

## Domain rule: a user has exactly one effective role

Roles are a strict hierarchy, not independent capabilities: `super_admin` ⊇ `admin` ⊇ `organizer` ⊇ `player`, each level a strict superset of the one below. Enforced at the database level, not just in application code: `user_roles` is `UNIQUE(user_id)` (one row per user), and the `app_role` enum is `player | organizer | admin | super_admin`.

```ts
const ROLE_LEVEL = {
  player: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3
} as const satisfies Record<AppRole, number>

function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
```

`PERMISSION_LEVEL` (`app/utils/permissions.ts`) maps each `Permission` to the *minimum* role it needs, once — not every role above it re-listing it. Full list kept in sync with `docs/architecture/permissions.md`'s matrix.

**`super_admin`'s reason to exist: *permanent* deletion, not destructive actions in general.** `admin` can create/edit/manage tournaments, leagues, events, associates; actually *deleting* one of those permanently is reserved one level higher, as a guard against an accidental destructive click rather than against a malicious admin. Does not extend to associates — an associate is never hard-deleted, membership status is derived from `pauperwave_associate_renewals` (`docs/architecture/database.md`).

**`manage-roles` is `admin`+, with the `super_admin` tier itself carved out at the RPC, not the permission constant.** "Block only self-promotion" was considered and rejected — trivially bypassable (an `admin` promotes a second account to `admin`, then uses *that* account to promote the first to `super_admin`). `assign_role(p_user_id uuid, p_role app_role)` (`SECURITY DEFINER`, migration `20260823130000`/`20260823140000`): (1) allows any `admin`-or-above caller; (2) rejects the call if the target `p_role` is `'super_admin'` **or** the target's *current* role already is `'super_admin'`, unless the caller is `super_admin` themselves; (3) unconditionally rejects any change to a row with `user_roles.role_locked = true` (a data-driven flag, not a hardcoded uuid — protects the app owner's account specifically, set once via a one-time data statement, never re-settable through `assign_role` itself). `get_user_role(uuid)` defaults to `'player'` when a user has no row — no separate "no role" state to handle; assigning `p_role = 'player'` deletes the row rather than inserting one.

## The real blocker: RLS, not UI

`pauperwave_associates` previously had a catch-all policy (`"Only auth users can do things"`, `FOR ALL`, `USING (true)`) granting every authenticated user full read/write on every associate row — tax codes, birth dates, home addresses — overriding the narrower `player_own_associate`/`management_full_access` policies since Postgres RLS policies are OR'd, not AND'd. Dropped in migration `20260822100000` (`docs/BACKLOG.md` P1, resolved).

This matters generally: any client-side role check is **UX only**. A player whose browser hides an "Elimina" button can still call the underlying endpoint directly. The actual security boundary is RLS (client tables) and `requireManagementPermission`/`requireAdminPermission`/`requireSuperAdminPermission`-style checks (BFF writes, `server/utils/serverAuth.ts`) — client-side role awareness makes the UI honest and avoids a round-trip-then-fail pattern, it doesn't protect anything by itself.

## Goal

Same routes for everyone — no `(player)` route group, no separate app. A player logging in sees:

- Different **content** on shared pages (e.g. a standings page shows the full table to everyone, but `/associates` might show only "my own record" instead of the full roster — decided per page, not a blanket rule).
- Different **permissions** (no edit/delete affordances, no management-only sections).
- Some routes fully inaccessible regardless of content adaptation (e.g. `/settings/members`) — a per-route decision, not an assumption that "same route, different content" applies everywhere.

## Implemented pattern

Three layers: resolve role → gate routes → adapt in-page UI.

### 1. Role state — a Pinia Colada query

`app/composables/useUserRole.ts`, same shape as every other `use<Domain>Query.ts` (`useWantedCardsQuery.ts` is the template):

```ts
export const USER_ROLE_KEY = ['user-role']

export function useUserRole() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  return useQuery({
    key: USER_ROLE_KEY,
    enabled: () => !!user.value,
    query: async () => {
      const { data, error } = await supabase.rpc('get_user_role', { p_user_id: user.value!.id })
      if (error) throw error
      return data // AppRole, defaults to 'player' at the DB level
    }
  })
}
```

Not wrapped in a Pinia store (`defineStore`) — no domain in this codebase is; a plain composable calling `useQuery` is equally callable from middleware (`useQuery`'s cleanup is gated behind `if (getCurrentScope())`, so it skips component-scope-bound cleanup when called from global middleware instead of erroring — the query's cache is keyed globally, not bound to whichever call site first created it).

**`status` (not `data` alone) gates every "is this decided yet" check.** `status: 'pending' | 'success' | 'error'` — anything other than `'success'` is treated as "not yet decided," same as the old `null`-means-unresolved convention. There is no `reset()` on a query's return value; invalidating a query on logout goes through the query cache (see §4), not a method on the query object.

**The query is excluded from `PiniaColadaCachePersister`'s `localStorage` persistence** (`colada.options.ts`'s `PERSISTENCE_EXCLUDED_KEYS`, ADR-009 in `docs/PROGRESS.md`) — every `useQuery` in this project persists by default, and a role is exactly the "sensitive, must not persist" case that exclusion mechanism exists for: without it, a role fetched for one user could sit in `localStorage` and be visible to a different person who logs into the same browser/device afterwards.

What's custom on top of the query: `can(role, permission)` (level comparison) and `isOrganizer`/`isAdmin`/`isSuperAdmin`/`isStaff` computed helpers for the common coarse checks — all gated on `status === 'success'` internally, so an unresolved or errored fetch can't be misread as a decided role.

### "View as" — production role preview

A `super_admin` can preview the app as `player`/`organizer`/`admin` without any real role change, to sanity-check what a given tier actually sees — usable in production, not just dev.

**UI-only, never a real security boundary** — RLS and BFF checks still run against the real, unmodified `auth.uid()` regardless of this override, so a `super_admin` previewing as `player` could still technically succeed at an admin-only write if they went around the now-hidden UI. The persistent top banner (`RolePreviewBanner.vue`, `t('rolePreview.banner')`) says this explicitly.

Implementation, in `useUserRole.ts`:
- `previewRole` — `useState<AppRole | null>('role-preview', () => null)`: survives client-side navigation during a preview session, but resets on a hard reload/new tab rather than persisting to disk, so a preview can never quietly outlive the session it was started in.
- `role` (the composable's already-consumed-everywhere export) is the *effective* role: `previewRole` if set and `ROLE_LEVEL[previewRole] <= ROLE_LEVEL[realRole]`, else `realRole`. Re-checked on every read, not cached at activation — if a `super_admin` gets demoted mid-session while previewing, the override stops applying the instant they no longer outrank it.
- `setRolePreview(target)` hard-guards `realRole.value === 'super_admin'` itself — never trusts the caller (the UI) already checked.
- `realRole`/`realIsSuperAdmin` are exposed separately from the effective `role`/`isSuperAdmin`, specifically so the exit control stays visible and usable *while actively previewing as a lower role* — gating "View as" on effective `isSuperAdmin` would let a `super_admin` previewing as `player` lock themselves out of the very control that turns it off.

Because `authorization.global.ts` and `useMainNavGroups.ts` both read the same effective `role`/`can()`, the preview automatically covers both nav visibility *and* route-level redirects (typing a super_admin-only URL directly while previewing as player correctly bounces to `/403`) — no separate wiring needed for either.

UI: `UserMenu.vue`'s "Visualizza come" submenu (`player`/`organizer`/`admin` as checkbox items, `super_admin` omitted since it's a no-op for the only role that can even see this menu), gated on `realIsSuperAdmin`; `RolePreviewBanner.vue` (`app/components/ui/`, per the `ui/` folder's no-prefix convention) renders a persistent top bar with an exit button whenever `isPreviewing`.

### 2. Route protection — `permission`, not a path allowlist

Each page declares what it needs:

```ts
definePageMeta({ permission: 'manage-members' })
```

and a single **permissions matrix** (`app/utils/permissions.ts`, `ROLE_LEVEL` + `PERMISSION_LEVEL`) is the one place that decides "who can do X." Adding or renaming a route never touches the middleware; changing which role a permission requires is a one-line change in `PERMISSION_LEVEL`, not a search for scattered `role === 'organizer'` checks. `PageMeta` is augmented so `permission` type-checks:

```ts
// app/types/nuxt.d.ts
declare module '#app' {
  interface PageMeta {
    permission?: Permission
  }
}
export {}
```

### 3. Two global middlewares

`app/middleware/auth.global.ts` keeps its own single job: "is there a session?" `app/middleware/authorization.global.ts` answers a different question: "is this session allowed on this route?" — reads `to.meta.permission`, calls `can()`, redirects to `/403` (distinct from `/login`: the user *is* who they say they are, they just can't be here) if denied.

Nuxt runs global middleware in filename alphabetical order, so `auth.global.ts` always runs before `authorization.global.ts` without extra configuration (`auth.` < `autho` — the `.` sorts before `o`).

**`authorization.global.ts` is self-sufficient** — it never assumes the role was already resolved elsewhere, it calls `await useUserRole().refresh()` itself and only then calls `can()`. If `status` comes back `'error'`, it denies access (fail closed) rather than letting the user through or silently redirecting to login.

### 4. Cache invalidation on auth changes

`app/plugins/user-role.client.ts` — `.client.ts`, not universal: the initial SSR-time fetch comes from middleware calling `useUserRole().refresh()` directly, and `onAuthStateChange` is a live browser-side event stream with no SSR equivalent. Subscribes to `supabase.auth.onAuthStateChange`:

- `SIGNED_OUT` → `queryCache.invalidateQueries({ key: USER_ROLE_KEY })`
- `SIGNED_IN` → same invalidation, forcing a fresh fetch — a different user may have just logged into the same browser
- `TOKEN_REFRESHED` → no-op, a token refresh doesn't change the role
- `USER_UPDATED` → not handled — no flow lets a logged-in user's own role change mid-session

### 5. In-page UI — `v-if="can(...)"`

`v-if="can('manage-members')"` (or `v-if="isStaff"` for the coarse case) inside shared pages/components hides/shows pieces of an otherwise-shared page. Reaching for `setPageLayout()` or a computed layout is only justified if the *structural* chrome (sidebar, header) needs to differ per role — not for hiding a button or a column.

### Enforcement — still RLS/BFF

Layers 2-5 above are UX, never the real boundary. Which enforcement mechanism a given player-facing write should use:

- **Plain ownership write** (e.g. `insert ... where user_id = auth.uid()`, no other business logic) → direct client write with the anon key, relying on RLS. Routing this through a BFF adds a network hop for zero extra safety — Postgres already verifies ownership in the policy.
- **Transactional / business-logic write** (e.g. tournament registration: check the tournament exists and is open, registration isn't closed, the player isn't already registered, a seat is free, then insert — atomically) → either a `SECURITY DEFINER` Postgres function the client calls directly with the anon key, or a BFF endpoint using the service-role key if the logic isn't cleanly expressible in SQL. Both are valid; picking one is a case-by-case call.
- **Never**: a BFF with the service-role key that only re-checks ownership. That's the `requireManagementPermission` pattern misapplied — RLS with `auth.uid()` already does that check, and re-implementing it after bypassing RLS with the service-role key adds a maintenance burden (two places that must agree) for no security gain.

### Worked example — `/tournaments`, `/leagues`, `/events`

Same route for staff and players, `v-if` inside it:

- **Admin-only affordances hidden**: "Nuovo torneo", "Modifica", "Elimina" stay behind `v-if="can('manage-tournaments')"` (or `isStaff`).
- **Player-only affordance shown**: an "Iscriviti" button. Registering for a tournament is the transactional case above, not plain ownership — it needs to check the tournament is open, the player isn't already registered, and (if capacity-limited) a seat is free, then insert atomically. That rules out a bare RLS ownership-style policy on its own: the checks beyond ownership aren't expressible in a single policy. Uses a dedicated RPC (`register_tournament_players`, migration `20260825110000`), not `requireManagementPermission` (wrong shape — that's "any row, if staff," this is "exactly one row, your own, only if the business rules allow it") and not a raw client insert relying on RLS alone (the business-rule checks would be missing).

### Quick-reference table

| Decision | Choice |
|---|---|
| Role state | Pinia Colada `useQuery` (`useUserRole.ts`), mirroring `useWantedCardsQuery.ts` |
| Wrapping it in a Pinia store (`defineStore`) | No — not a pattern used anywhere else in this codebase |
| Role query persistence | Excluded via `colada.options.ts`'s `filter` (ADR-009) — sensitive, shared-device risk otherwise |
| Roles per user | Exactly one, hierarchical (`super_admin` ⊇ `admin` ⊇ `organizer` ⊇ `player`) |
| `can()` | Numeric level comparison (`ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]`), not a per-role permission list |
| Middleware | Two, separate: `auth.global` + `authorization.global` |
| Unresolved role (`status !== 'success'`) | Never treated as decided, in `can()` or anywhere else |
| Middleware on unresolved role | `await refresh()` — never calls `can()` before that resolves |
| `status === 'error'` | Deny access (fail closed), not a silent redirect |
| Protected routes | `definePageMeta({ permission })`, no path allowlist |
| Role-aware UI | `v-if="can(...)"` in components |
| Permission-denied redirect | `/403`, distinct from `/login` |
| Simple ownership write | Direct client write, RLS (`auth.uid()`) enforces it |
| Transactional/business write | Postgres `SECURITY DEFINER` function, or a BFF endpoint |
| Real security | Still RLS + server-side checks |

## Wider roadmap (context, not scoped now)

Future player-area shape, not yet scoped or estimated: tournament pre-registration, commander deck submission, payment/membership-renewal history, event participation stats. To be broken down into `docs/BACKLOG.md`/`docs/TODO.md` items individually as each is actually picked up.
