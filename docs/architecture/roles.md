# Roles and permissions

<!-- docs/architecture/roles.md -->

How to give players a different (restricted, adapted) view of the same app the admin/organizer staff uses, instead of a separate player app or a separate route tree. Written 2026-08-10, starting point requested by the user: `BACKUP CODICE APP/docs` (`1-roles.md`, `3-RLS-policies.md`), cross-checked against `docs/audits/2026-08-09-backup-docs-vs-live-schema.md` and the live generated types (`shared/utils/types/database.ts`) rather than trusted as-is — those backup docs are a design draft, not a description of what was built (see the audit's headline).

## What's actually live today

Confirmed via the audit + `shared/utils/types/database.ts` (generated from the real DB, never hand-edited):

- `app_role` DB enum: `player | organizer | admin | super_admin` (migrated 2026-08-17, `supabase/migrations/20260817090000_app_role_drop_judge_add_super_admin.sql`) — `judge` dropped, `super_admin` added as a new top tier above `admin`, matching the hierarchy decided 2026-08-10 below. Confirmed beforehand that no `user_roles` row used `role = 'judge'` and no `app_role`-typed column existed anywhere else, so the type recreation was a single, uneventful migration (rename old type, create new, `ALTER COLUMN ... USING role::text::app_role`, drop old type).
- `user_roles` table (`user_id → auth.users(id)`, `role`) exists — **tightened 2026-08-17** from `UNIQUE(user_id, role)` to `UNIQUE(user_id)` in the same migration (confirmed beforehand: no user had more than one role row), enforcing the "exactly one effective role" domain rule at the database level, not just in application code.
- RPCs confirmed live: `has_management_permissions(uuid)`, `is_admin(uuid)`, `is_super_admin(uuid)` (added 2026-08-17), `get_user_role(uuid)`, `get_user_roles`, `has_role`, `is_organizer`. `is_judge` dropped 2026-08-17 along with the role it checked. `has_management_permissions` now treats `super_admin` as a superset of `admin`/`organizer`; `is_admin` stays strictly `'admin'` (does **not** include `super_admin`) — `user_roles`'s own `admin_full_access` write policy was repointed from `is_admin` to `is_super_admin`, since `manage-roles` is scoped `super_admin`-only per the permission matrix below, and plain `admin` no longer manages role assignments via this table.
- `get_user_role(uuid)` defaults to `'player'` when a user has no row in `user_roles` — no separate "no role" state to handle.
- **`assign_role(p_user_id uuid, p_role app_role)` created 2026-08-17.** Restricted to `is_super_admin(auth.uid())`, not `is_admin` — matches `manage-roles` being scoped `super_admin`-only (§1's `PERMISSION_LEVEL`). Upserts into `user_roles` (`ON CONFLICT (user_id) DO UPDATE`, since the table is now `UNIQUE(user_id)`); assigning `p_role = 'player'` deletes the row instead of inserting one, matching the existing convention that `player` is just `get_user_role`'s `COALESCE` default and never gets a stored row. `MembersList.vue`'s role dropdown still isn't wired to it (see the TODO note below) — the RPC exists, the UI call doesn't yet.

Confirmed via `server/utils/serverAuth.ts` (actual application code, not docs):

- `requireManagementPermission(event)` already wraps `has_management_permissions` and is used by every `wanted-cards`/`cardtrader` BFF endpoint (`server/api/wanted-cards/*.post.ts`) to gate management-only writes server-side.
- **Nothing resolves the role client-side today.** No composable, no `useSupabaseUser`-based check, nothing. Every authenticated user currently sees the entire gestionale — sidebar, associates list, settings, all of it — regardless of role.

Two known consumers already waiting on this, found while auditing rather than invented for this doc:

- `docs/TODO.md` (2026-08-07): "Elimina" on a wanted-card request currently round-trips to the server and fails for non-admins instead of being hidden, explicitly because "there's no role/permission check wired into the frontend anywhere yet." Its own next step is "once there's a real way to know 'is the current logged-in user an admin' client-side, hide/disable 'Elimina' for non-admins."
- `app/components/settings/MembersList.vue` has a role dropdown in the UI that isn't tied to auth at all (same TODO entry) — currently decorative.

## The real blocker: RLS, not UI

`docs/BACKLOG.md` P1: `pauperwave_associates` has a catch-all policy (`"Only auth users can do things"`, `FOR ALL`, `USING (true)`) granting every authenticated user full read/write on every associate row — tax codes, birth dates, home addresses — and it overrides the narrower `player_own_associate`/`management_full_access` policies since Postgres RLS policies are OR'd, not AND'd.

This matters here specifically: any client-side role check below is **UX only**. A player whose browser hides an "Elimina" button can still call the underlying endpoint directly. The actual security boundary is RLS (client tables) and `requireManagementPermission`-style checks (BFF writes) — both already established patterns in this repo, not something this doc introduces. Client-side role awareness is worth building because it makes the UI honest and avoids the round-trip-then-fail pattern the wanted-cards TODO describes, not because it protects anything by itself. The P1 policy fix is a prerequisite for that boundary being real on `pauperwave_associates` specifically; it does not block building the client-side layer, but it does mean "player can't see other associates' PII" isn't actually true yet regardless of what the UI shows.

The backup docs' `3-RLS-policies.md` also proposes `public_read USING (true)` on `tournaments`/`tournament_standings`/`players` — unverified whether that was ever applied (per the audit, §5.5). Worth checking before assuming any standings-style data is already publicly/player readable.

## Goal, as scoped by the user

Same routes for everyone — no `(player)` route group, no separate app. A player logging in sees:

- Different **content** on shared pages (e.g. a standings page shows the full table to everyone, but `/associates` might show only "my own record" instead of the full roster — decided per page, not a blanket rule).
- Different **permissions** (no edit/delete affordances, no management-only sections).
- Some routes likely still fully inaccessible regardless of content adaptation (e.g. `/settings/members`) — this needs a per-route decision, not an assumption that "same route, different content" applies everywhere.

This replaces the earlier direction explored for the standings pages specifically (a dedicated `(player)`-style minimal layout) — see the correction in ADR-011, `docs/PROGRESS.md`: those pages stay behind the existing magic-link login rather than becoming public, and now fold into this same shared-route model instead of a separate area.

## Proposed pattern (decided 2026-08-10, reviewed against current Nuxt 4 practice)

The three-layer shape (resolve role → gate routes → adapt in-page UI) held up under review — no newer pattern replaces it — but each layer has a specific, opinionated implementation now, chosen over the alternatives for stated reasons. Not yet implemented; this is the plan to build against.

### 1. Role state — a Pinia Colada query, not hand-rolled `useState`

**Revised 2026-08-10.** The earlier "`useState`, not Pinia" framing was answering the wrong question. `@pinia/colada` isn't a hypothetical addition to weigh against `useState` — it's already a live, established pattern in this exact codebase (`useWantedCardsQuery.ts`, ADR-007/009 in `docs/PROGRESS.md`), and it exists specifically to solve "fetch this, cache it, expose loading/error state" — precisely what the `role`/`status`/`fetchRole`/`ensureRole` apparatus below was reinventing by hand.

**Domain rule, confirmed 2026-08-10: a user has exactly one effective role.** This app's roles are a strict hierarchy, not independent capabilities — `super_admin` ⊇ `admin` ⊇ `organizer` ⊇ `player`, each level a strict superset of the one below. (`judge` was considered and dropped from the app-level model the same day; a 4th tier, `super_admin`, was added above `admin` — see the DB-enum note above and `docs/architecture/permissions.md` for the concrete per-feature split.) This settles the multi-role question from earlier drafts of this doc: build on `get_user_role` (singular) after all, not `get_user_roles`, and express `can()` as a numeric level comparison, not a union over a role set:

```ts
const ROLE_LEVEL = {
  player: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3
} as const satisfies Record<AppRole, number>

const PERMISSION_LEVEL = {
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
  // ... full list tracked in docs/architecture/permissions.md, kept in sync
} as const satisfies Record<Permission, AppRole>

function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
```

This is a smaller permissions matrix than the earlier `role → Permission[]` shape: each permission declares the *minimum* role it needs, once, instead of every role above it having to re-list it. `app/utils/permissions.ts` (§2) becomes `ROLE_LEVEL` + `PERMISSION_LEVEL`, not a `Record<AppRole, Permission[]>`.

**`super_admin`'s reason to exist beyond role assignment, confirmed 2026-08-10: permanent/irreversible actions.** `admin` can create/edit/manage tournaments, leagues, events, associates; actually *deleting* one of those permanently is reserved one level higher, as a guard against an accidental destructive click rather than against a malicious admin — see `docs/architecture/permissions.md`'s note on this. Explicitly **does not extend to associates**: an associate is never hard-deleted today, membership status is derived from `pauperwave_associate_renewals` (`docs/architecture/database.md`), so there is no "delete an associate" action for this rule to gate in the first place. Same category, confirmed the same day: **cancelling an already-started round** — an `organizer` runs a tournament including its rounds day to day, but voiding a round outright is carved out as its own permission, one level above ordinary tournament management.

`app/composables/useUserRole.ts`, mirroring `useWantedCardsQuery.ts`'s shape:

```ts
export const USER_ROLE_KEY = ['user-role']

export function useUserRole() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  return useQuery({
    key: USER_ROLE_KEY,
    enabled: () => !!user.value, // don't fire the RPC with no session to resolve
    query: async () => {
      const { data, error } = await supabase.rpc('get_user_role', { p_user_id: user.value!.id })
      if (error) throw error
      return data // AppRole, defaults to 'player' at the DB level (COALESCE, confirmed above)
    }
  })
}
```

This retires almost the entire hand-rolled apparatus the first draft specified, because Colada's `useQuery` already provides it (confirmed against the installed package's own types, `node_modules/@pinia/colada/dist/index.d.mts`, not assumed):

- `status: ShallowRef<'pending' | 'success' | 'error'>` — the idle/loading/ready/error state, for free. `'pending'` covers both "not fetched yet" and "fetching"; there's a *separate* `asyncStatus: 'idle' | 'loading'` for the loading-vs-idle distinction specifically — **`asyncStatus` cannot be `'error'`, only `status` can** (verified against the type declarations; a check like `asyncStatus === 'error'` would be dead code, always false). `can()` and the middleware should treat anything other than `status === 'success'` as "not yet decided," same as the old `null`-means-unresolved rule — just expressed through Colada's status instead of a custom one.
- `refresh(): Promise<DataState<...>>` — "ensures the current data is fresh; if stale, refetch, if not, return as is." This **is** `ensureRole()` — idempotent, awaitable, and its in-flight-request dedup is handled internally by the query cache. The entire multi-round debate earlier in this doc's history about `_pendingFetch` (module-level `let` vs. `useState` vs. `useNuxtApp()`) is moot: it was solving a problem a real query library already solves correctly as its core job. Nothing here needs a custom Promise-tracking variable.
- `data`/`error` — the resolved role and any fetch error, both reactive.

**There is no `reset()` on a query's return value** (checked: absent from `UseQueryReturn` in the installed types). Invalidating/clearing a query on logout goes through the query cache, not a method on the query object — see §4.

**A plain composable calling `useQuery` is callable from middleware, same as a store would be — no store is needed for that reason.** `useQuery`'s internal cleanup is gated behind `if (getCurrentScope())` (confirmed in `@pinia/colada`'s source, `dist/index.mjs`): it *skips* the component-scope-bound cleanup when called somewhere without an active Vue effect scope — global middleware, like a plugin — rather than erroring. The query's cache is keyed globally (by `USER_ROLE_KEY`), not bound to whichever call site first created it, so a component and `authorization.global.ts` calling `useUserRole()` read/share the exact same cached entry either way. `auth.global.ts` already calls a composable (`useSupabaseSession()`) directly from middleware today — this is the same shape, not a new capability a store would be uniquely providing.

What's still genuinely custom, on top of the query:

- `can(role, permission)` (level comparison, per the code above) and `isOrganizer`/`isAdmin`/`isSuperAdmin`/`isStaff` — `data.value === 'organizer'`, `=== 'admin'`, `=== 'super_admin'`, `!== 'player'` respectively, computed helpers for the common coarse checks.

**Do not wrap this in a Pinia store (`defineStore`).** Nothing in this codebase does — every Colada-backed domain (`useWantedCardsQuery`/`useWantedCardsMutations`, and every other `use<Domain>Query.ts`) is a plain composable calling `useQuery`/`useMutation` directly, no store layer in between. A `useSessionStore` bundling user+role+profile together would be inconsistent with that convention for no benefit specific to this codebase: the "utente" part is already free via `useSupabaseUser()` (built into `@nuxtjs/supabase`), and "profilo" already has `useCurrentAssociate()` (not yet Colada-migrated, tracked separately in `docs/BACKLOG.md` P1 — a pre-existing, independent piece of work, not something to fold into this one). Three independent composables, combined at the call site where a component needs more than one, is the shape everything else in this app already uses. **The specific justification "a store is needed so middleware can read the query" doesn't hold up** — see the `getCurrentScope()` note below: a plain composable is equally callable from middleware.

**New finding, not covered by any earlier round of this doc: persistence.** ADR-009 (`docs/PROGRESS.md`) — every `useQuery` in this project persists to `localStorage` by default via `PiniaColadaCachePersister`, registered with no `filter` in `colada.options.ts` (confirmed: the file has no `filter` option today, so nothing is currently excluded). A role is exactly the "sensitive, must not persist" case ADR-009 itself names as the reason the `filter` option exists — without an explicit exclusion, a role fetched for one user could sit in `localStorage` and be visible (even briefly, before `refresh()` resolves) to a different person who logs into the same browser/device afterwards. **`useUserRole`'s query must be excluded via `colada.options.ts`'s `filter` strictly before this composable is built** (confirmed 2026-08-10, not merely "at the same time") — see step 5 in the build order below.

**Resolved 2026-08-17.** `user_roles`'s schema previously allowed multiple rows per user — the app-level single-role rule wasn't enforced by the database. Fixed in the same migration as the enum recreation above: confirmed no user had more than one row in `user_roles` first, then changed the constraint from `UNIQUE(user_id, role)` to `UNIQUE(user_id)` (`uq_user_roles_user_id`), so the database itself now rejects a second role row for the same user instead of relying on `assign_role`/application code to remember the rule.

### "View as" — production role preview (added 2026-08-17)

For development *and* live-production use: a `super_admin` can preview the app as `player`/`organizer`/`admin` without any real role change, to sanity-check what a given tier actually sees. Checked `MagicTheGathering/league` first for prior art — it has no per-user role system at all (a single shared `SITE_PASSWORD` gate), nothing to borrow.

**UI-only, never a real security boundary** — the same principle as `can()`/route gating generally (see "Enforcement" below): RLS and BFF checks still run against the real, unmodified `auth.uid()` regardless of this override, so a `super_admin` previewing as `player` could still technically succeed at an admin-only write if they went around the now-hidden UI. The persistent top banner (`RolePreviewBanner.vue`, `t('rolePreview.banner')`) says this explicitly, so nobody mistakes "what I currently see" for "what I can currently do."

Implementation, in `useUserRole.ts`:
- `previewRole` — `useState<AppRole | null>('role-preview', () => null)`, not a plain `ref` or `localStorage`: survives client-side navigation during a preview session (the point of it), but resets on a hard reload/new tab rather than persisting to disk, so a preview can never quietly outlive the session it was started in.
- `role` (the composable's existing, already-consumed-everywhere export) becomes the *effective* role: `previewRole` if set and `ROLE_LEVEL[previewRole] <= ROLE_LEVEL[realRole]`, else `realRole`. Re-checked on every read, not cached at activation — if a `super_admin` gets demoted mid-session while previewing, the override stops applying the instant they no longer outrank it, rather than leaving a stale escalated-looking state around.
- `setRolePreview(target)` hard-guards `realRole.value === 'super_admin'` itself — never trust the caller (the UI) already checked.
- `realRole` / `realIsSuperAdmin` are exposed separately from the effective `role`/`isSuperAdmin`, specifically so the exit control stays visible and usable *while actively previewing as a lower role* — gating "View as" on effective `isSuperAdmin` would let a `super_admin` previewing as `player` lock themselves out of the very control that turns it off (`/settings/members`-style pages become inaccessible under the preview, but the always-visible `UserMenu` isn't route-gated).

Because `authorization.global.ts` and `useMainNavGroups.ts` both read the same effective `role`/`can()`, the preview automatically covers both nav visibility *and* route-level redirects (typing a super_admin-only URL directly while previewing as player correctly bounces to `/403`) — no separate wiring needed for either.

UI: `UserMenu.vue`'s "Visualizza come" submenu (`player`/`organizer`/`admin` as checkbox items, `super_admin` omitted since it's a no-op for the only role that can even see this menu), gated on `realIsSuperAdmin`; `RolePreviewBanner.vue` (`app/components/ui/`, per the `ui/` folder's no-prefix convention) renders a persistent top bar with an exit button whenever `isPreviewing`. Verified end-to-end in the browser (2026-08-17): activating "Giocatore" correctly hid Finanze/Associati/Giocatori/Transazioni/Luoghi/Regolamenti/Impostazioni from the sidebar and showed the banner; exiting restored the full `super_admin` sidebar; no console errors.

**Bootstrap data for `assign_role` (step 3 below), recorded 2026-08-10, roles corrected and expanded 2026-08-11 so it isn't lost before the mechanism exists. Applied by hand via the SQL editor 2026-08-17** (`assign_role` still doesn't exist — see step 3), confirmed against `pauperwave_associates.email_address` and `auth.users`:

| Person | Email (`pauperwave_associates.email_address`) | Role | Status |
|---|---|---|---|
| Emanuele Nardi | `emanuelenardi.magic@gmail.com` | `super_admin` | ✅ applied 2026-08-17 — confirmed by the user (was `admin`, no longer "inferred") |
| Marco Cazzola | `cazzola.marco@gmail.com` | `admin` | ✅ applied 2026-08-17 (was `organizer`) |
| Lorenzo Castelli | `hegauj@gmail.com` | `admin` | ✅ already applied prior to 2026-08-17, confirmed matches this identity |
| Nicola Cordeschi | `dnick88@yahoo.it` | `admin` | ✅ applied 2026-08-17 (was `organizer`) |
| Simone Marisa | `simone.marisa95@gmail.com` | `organizer` | ⏳ **pending** — no `auth.users` row yet (never logged in). `user_roles.user_id` is a `NOT NULL` FK to `auth.users(id)`, so there's nothing to attach a role to until their first magic-link login creates one. |
| Gianluca Festi | `gianlucafesti@yahoo.it` | `organizer` | ⏳ **pending**, same reason |
| Riccardo Baldo | `riccardo.baldo@live.it` | `organizer` | ⏳ **pending**, same reason |

Everyone else defaults to `player` (no row needed, per `get_user_role`'s `COALESCE`).

### 2. Route protection — `permission`, not a path allowlist

Reject the path-allowlist idea from the first draft of this doc. Instead, each page declares what it needs:

```ts
definePageMeta({ permission: 'manage-members' })
```

and a single **permissions matrix** (`app/utils/permissions.ts`, `ROLE_LEVEL` + `PERMISSION_LEVEL`, per §1) is the one place that decides "who can do X." Adding or renaming a route never touches the middleware; changing which role a permission requires is a one-line change in `PERMISSION_LEVEL`, not a search for scattered `role === 'organizer'` checks. Requires augmenting Nuxt's `PageMeta` type so `permission` type-checks:

```ts
// app/types/nuxt.d.ts
declare module '#app' {
  interface PageMeta {
    permission?: Permission
  }
}
export {}
```

### 3. Two global middlewares, not one

`app/middleware/auth.global.ts` keeps its current, single job: "is there a session?" A new `app/middleware/authorization.global.ts` answers a different question: "is this session allowed on this route?" — reads `to.meta.permission`, calls `can()`, redirects to `/403` (a new, dedicated route — semantically distinct from `/login`: the user *is* who they say they are, they just can't be here) if denied.

Nuxt runs global middleware in filename alphabetical order, so `auth.global.ts` always runs before `authorization.global.ts` without extra configuration (`auth.` < `autho` — the `.` sorts before `o`). No manual ordering needed, but don't rely on that alone being obvious in six months — the alphabetical dependency is exactly why the two files are named this way, not `auth.global.ts` + `permissions.global.ts`.

**`authorization.global.ts` must be self-sufficient.** It never assumes the role was already resolved elsewhere — it calls `await useUserRole().refresh()` itself and only then calls `can()`. If `status` comes back `'error'`, it denies access (fail closed) rather than letting the user through or silently redirecting to login. Anything other than `status === 'success'` must never reach `can()` — always `await refresh()` first.

### 4. Cache invalidation on auth changes — a plugin, scope reduced by Colada

`app/plugins/user-role.ts`. With the query itself doing the fetch/cache/dedup work (§1), this plugin's job shrinks to one thing Colada doesn't know about on its own: **a login/logout doesn't change the query's key, so nothing tells the cache the previously-fetched role is now stale for a different user.** Subscribe to `supabase.auth.onAuthStateChange`:

- `SIGNED_OUT` → `queryCache.invalidateQueries({ key: USER_ROLES_KEY })` (same `invalidate()` shape `useWantedCardsMutations.ts` already uses after a write)
- `SIGNED_IN` → same invalidation, forcing a fresh fetch — a different user may have just logged into the same browser
- `TOKEN_REFRESHED` → no-op, a token refresh doesn't change the role
- `USER_UPDATED` → not handled for now; only relevant if a flow lets a logged-in user's own role change mid-session, which doesn't exist yet

**Whether this plugin needs to be universal (no `.client` suffix) is worth re-checking, not assumed from the first draft.** The earlier reasoning ("a `.client.ts` plugin doesn't exist during SSR, so the first SSR-time middleware run sees an unresolved role with no way to tell 'not checked' from 'no role'") assumed a hand-rolled fetch that only the plugin triggered. That's no longer true: `authorization.global.ts` calling `useUserRole().refresh()` itself (§3) already triggers Colada's fetch on its own, during SSR, without needing the plugin to have run first — middleware calling a composable is standard Nuxt (`auth.global.ts` already does this via `useSupabaseSession()`). `onAuthStateChange`'s subscription, on the other hand, reacts to a live browser-side event stream — there's no equivalent "state changing mid-request" during a stateless SSR request. If that reasoning holds, this plugin can likely be `.client.ts` after all, simpler than the original universal-plugin requirement; confirm during implementation rather than carrying the older assumption forward unquestioned.

### 5. In-page UI — `v-if="can(...)"`, unchanged from the first draft

Confirmed as the right call on review: `v-if="can('manage-members')"` (or `v-if="isStaff"` for the coarse case) inside shared pages/components is correct and idiomatic for hiding/showing pieces of an otherwise-shared page. Reaching for `setPageLayout()` or a computed layout would only be justified if the *structural* chrome (sidebar, header) needed to differ per role — not for hiding a button or a column.

### Enforcement — still RLS/BFF, with one added distinction

Layers 2-5 above are UX, never the real boundary — unchanged from the first draft. What's new is a concrete rule for *which* enforcement mechanism a given player-facing write should use:

- **Plain ownership write** (e.g. `insert ... where user_id = auth.uid()`, no other business logic) → direct client write with the anon key, relying on RLS. Routing this through a BFF adds a network hop for zero extra safety — Postgres already verifies ownership in the policy.
- **Transactional / business-logic write** (e.g. tournament registration: check the tournament exists and is open, registration isn't closed, the player isn't already registered, a seat is free, then insert — atomically) → either a `SECURITY DEFINER` Postgres function the client calls directly with the anon key (Postgres owns the atomicity, the function itself is the trust boundary), or a BFF endpoint using the service-role key if the logic isn't cleanly expressible in SQL. Both are valid; picking one is a case-by-case call, not a rule.
- **Never**: a BFF with the service-role key that only re-checks ownership. That's the `requireManagementPermission` pattern misapplied — RLS with `auth.uid()` already does that check, and re-implementing it after bypassing RLS with the service-role key adds a maintenance burden (two places that must agree) for no security gain.

### Worked example — `/tournaments`, `/leagues`, `/events`

Same route for staff and players, `v-if` inside it:

- **Admin-only affordances hidden**: "Nuovo torneo", "Modifica", "Elimina" stay behind `v-if="can('manage-tournaments')"` (or `isStaff`), same shape as the wanted-cards "Elimina" case.
- **Player-only affordance shown**: an "Iscriviti" button. Registering for a tournament is the transactional case above, not plain ownership — it needs to check the tournament is open, the player isn't already registered, and (if capacity-limited) a seat is free, then insert atomically. That rules out a bare RLS `player_own_registration`-style policy (`3-RLS-policies.md:90-96`) on its own: the checks beyond ownership aren't expressible in a single policy. Use a `SECURITY DEFINER` Postgres function or a dedicated BFF endpoint (`server/api/tournaments/[id]/register.post.ts`), not `requireManagementPermission` (wrong shape — that's "any row, if staff," this is "exactly one row, your own, only if the business rules allow it") and not a raw client insert relying on RLS alone (the business-rule checks would be missing).

### Quick-reference table

| Decision | Choice |
|---|---|
| Role state | Pinia Colada `useQuery` (`useUserRole.ts`), mirroring `useWantedCardsQuery.ts` |
| Hand-rolled `useState`/`fetchRole`/`ensureRole`/pending-promise tracking | No — Colada's `status`/`refresh()` already do this |
| Wrapping it in a Pinia store (`defineStore`) | No — not a pattern used anywhere else in this codebase |
| Role query persistence | Must be excluded via `colada.options.ts`'s `filter` (ADR-009), strictly before the composable is built — sensitive, shared-device risk otherwise |
| Roles per user | Exactly one, hierarchical (`super_admin` ⊇ `admin` ⊇ `organizer` ⊇ `player`) — confirmed 2026-08-10, dropped `judge`, added `super_admin`, dropped the earlier multi-role/union design |
| `can()` | Numeric level comparison (`ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]`), not a per-role permission list |
| `user_roles`/`app_role` schema | Both need tightening to match: `UNIQUE(user_id)` instead of `UNIQUE(user_id, role)`, and `judge` removed from the `app_role` enum (real type migration, not a rename) |
| Middleware | Two, separate: `auth.global` + `authorization.global` |
| Unresolved role (`status !== 'success'`) | Never treated as decided, in `can()` or anywhere else |
| Middleware on unresolved role | `await refresh()` — never calls `can()` before that resolves |
| `status === 'error'` | Deny access (fail closed), not a silent redirect |
| Protected routes | `definePageMeta({ permission })`, no path allowlist |
| Role-aware UI | `v-if="can(...)"` in components |
| Permission-denied redirect | `/403`, distinct from `/login` |
| Simple ownership write | Direct client write, RLS (`auth.uid()`) enforces it |
| Transactional/business write | Postgres `SECURITY DEFINER` function, or a BFF endpoint |
| Real security | Still RLS + server-side checks, unchanged |

## Wider roadmap (context, not scoped now)

`BACKUP CODICE APP/docs/blog.md` is superseded on the blog itself (blog is now a separate Nuxt Content repo, not part of this project), but its "funzionalità future per gli associati" list is still a reasonable shape for where the player area eventually goes: tournament pre-registration, commander deck submission, payment/membership-renewal history, event participation stats. None of this is scoped or estimated — recorded here so it isn't lost a second time, to be broken down into `docs/BACKLOG.md`/`docs/TODO.md` items individually as each is actually picked up.

## Suggested order of work

1. Decide and resolve the `pauperwave_associates` P1 policy (`docs/BACKLOG.md`) — not a hard blocker for starting the steps below, but "player can't see other members' PII" stays false until it's fixed.
2. Confirm whether `public_read` was applied to `tournaments`/`tournament_standings`/`players` (audit §5.5) — changes what's already safe to read as a player vs. what still needs a BFF/RPC.
3. **Done 2026-08-17.** `assign_role(uuid, app_role)` created in Supabase (`supabase/migrations/20260817100000_create_assign_role_function.sql`), see §1 — prerequisite for wiring `MembersList.vue`'s dropdown, still not wired up (that's step 12).
4. **Done 2026-08-17,** except 3 people. DB migration for the 4-role model, confirmed 2026-08-10 (§1): recreated the `app_role` enum without `judge` and with `super_admin` added, tightened `user_roles` from `UNIQUE(user_id, role)` to `UNIQUE(user_id)`. Bootstrap role assignments (§1's table) applied by hand via the SQL editor (`assign_role` from step 3 still doesn't exist) for the 4 people who'd already logged in; Simone Marisa, Gianluca Festi, and Riccardo Baldo remain pending — no `auth.users` row yet, see §1.
5. **Done 2026-08-17.** `app/utils/permissions.ts` — `ROLE_LEVEL` + `PERMISSION_LEVEL` (§1) and the `Permission` type, plus `can()`, all auto-imported (confirmed against `.nuxt/imports.d.ts`, no drop-off from the array-literal-export gotcha in the global CLAUDE.md, since none of these are array literals). The 13-entry `PERMISSION_LEVEL` set is exactly §1's example list — matches `docs/architecture/permissions.md`'s matrix for the domains already scoped there; new permissions get added to both together as each remaining domain is scoped (step 13).
6. **Done 2026-08-17.** `colada.options.ts` — `'user-role'` added to `PERSISTENCE_EXCLUDED_KEYS`, landed strictly before step 7 as required.
7. **Done 2026-08-17.** `app/composables/useUserRole.ts` — `useQuery`-backed on `get_user_role` (§1), `can`/`isOrganizer`/`isAdmin`/`isSuperAdmin`/`isStaff` on top of it. One deviation from the literal §1 code sample: `isStaff`/`isAdmin`/etc. gate on `status === 'success'` via an internal `role` computed, not raw `data.value`, so an unresolved or errored fetch can't be misread as a decided role — consistent with the "unresolved role never treated as decided" rule stated elsewhere in §1, which the literal `data.value !== 'player'` formula for `isStaff` would otherwise violate while `status` is still `'pending'`.
8. **Done 2026-08-17.** `app/plugins/user-role.client.ts` — the `onAuthStateChange` → `queryCache.invalidateQueries` subscription (§4). Decided `.client.ts`, not universal: §4's reasoning held up — `onAuthStateChange` is a live browser-side event stream with no SSR equivalent, and the initial SSR-time fetch comes from middleware calling `useUserRole().refresh()` directly (step 10), not from this plugin.
9. **Done 2026-08-17.** `app/types/nuxt.d.ts` — `PageMeta.permission` augmentation, so `definePageMeta({ permission: ... })` type-checks. `Permission` resolves ambiently (Nuxt auto-imports types too), no explicit import needed; confirmed via a clean `pnpm typecheck`.
10. **Done 2026-08-17.** `app/middleware/authorization.global.ts` — reads `to.meta.permission`, `await useUserRole().refresh()` then `useUserRole().can(permission)`, redirect to `/403` on denial. Returns early (no RPC call at all) when `to.meta.permission` is unset, which is every route today until step 13 adopts `definePageMeta({ permission })` route by route. Confirmed the filename ordering: `app/middleware/auth.global.ts` (unchanged) still runs first.
11. **Done 2026-08-17.** `app/pages/403.vue` — new, distinct from `/login`, default layout (the user has a valid session, they just lack the permission).
12. **Partially done 2026-08-17.** Wired `can()` into `useMainNavGroups.ts` (nav-visibility permission map decided together with the user, see `docs/architecture/permissions.md`'s "Navigazione" section: `view-associates`/`view-finance`/`view-players`/`manage-locations`/`manage-rulesets`/`access-settings`/`manage-domains`, all `organizer` except `manage-domains` at `admin`). Groups whose every item gets filtered out are dropped entirely, not left as a dangling header. Verified live in the browser as `super_admin` — full sidebar renders correctly. **Still outstanding:** the wanted-cards "Elimina" button `v-if` and `MembersList.vue`'s promotion dropdown wiring (step 3's RPC exists, nothing calls it from the UI yet).
    - **Real bug found and fixed during this verification, not part of the original plan:** `useUserRole.ts` initially used `useSupabaseUser()`, which got stuck permanently unresolved in this app (same `getClaims()` flakiness `auth.global.ts` and `auth/callback.vue` already warn about in their own comments) — every nav item silently stayed hidden, even for `super_admin`, no thrown error. Fixed by decoding the user id straight out of the JWT's `sub` claim via `useSupabaseSession()`'s `access_token`, matching the pattern those two files already use, instead of depending on `useSupabaseUser()` at all.
13. Go route by route deciding `permission` requirements and in-page `v-if` adaptation — `/standings/*` (already shared per ADR-011) first since no write path is involved, `/tournaments`/`/leagues`/`/events` after (needs the registration write decision — Postgres function vs. BFF — settled per the worked example above).
