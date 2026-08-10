# Roles and permissions

<!-- docs/architecture/roles.md -->

How to give players a different (restricted, adapted) view of the same app the admin/organizer staff uses, instead of a separate player app or a separate route tree. Written 2026-08-10, starting point requested by the user: `BACKUP CODICE APP/docs` (`1-roles.md`, `3-RLS-policies.md`), cross-checked against `docs/audits/2026-08-09-backup-docs-vs-live-schema.md` and the live generated types (`shared/utils/types/database.ts`) rather than trusted as-is — those backup docs are a design draft, not a description of what was built (see the audit's headline).

## What's actually live today

Confirmed via the audit + `shared/utils/types/database.ts` (generated from the real DB, never hand-edited):

- `app_role` DB enum: `admin | organizer | judge | player`, matches the backup docs exactly. **The application-level role model needs revising to `player | organizer | admin | super_admin`** (decided 2026-08-10, see the hierarchy note below) — `judge` dropped, a new top tier `super_admin` added above `admin`. **Both changes require the same migration**, and can be done in one pass: Postgres has no `ALTER TYPE ... DROP VALUE` (removing `judge` means creating a new enum type without it, repointing every column/function typed against the old one, then dropping the old type) but does support `ALTER TYPE ... ADD VALUE` cheaply (adding `super_admin`) — since the removal already forces a full type recreation, add the new value as part of that same recreation rather than a separate step. Do this only after confirming no row anywhere currently has `role = 'judge'` (check `user_roles`, and anywhere else `app_role` is used as a column type) — if one exists, decide what it becomes first (`organizer`, per the hierarchy) before the type migration, not after.
- `user_roles` table (`user_id → auth.users(id)`, `role`, unique per `(user_id, role)`) exists.
- RPCs confirmed live: `has_management_permissions(uuid)`, `is_admin(uuid)`, `get_user_role(uuid)`, `get_user_roles`, `has_role`, `is_judge`, `is_organizer`.
- `get_user_role(uuid)` defaults to `'player'` when a user has no row in `user_roles` — no separate "no role" state to handle.
- **Missing:** `assign_role(uuid, app_role)`, the backup doc's entire answer to "how does an admin promote someone." Either promotion happens by hand in the SQL editor today, or it was replaced by something undocumented — resolve this before building any in-app role-management UI. **Direction (2026-08-10):** the promotion mechanism belongs in `/settings/members` — `app/components/settings/MembersList.vue` already has a role dropdown for this, just not wired to auth (see the TODO note below), so this is completing an existing UI rather than adding a new one.

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
  'manage-members': 'admin',
  'manage-membership-fees': 'admin',
  'manage-all-commander-decks': 'admin',
  'manage-roles': 'super_admin'
  // ... full list tracked in docs/architecture/permissions.md, kept in sync
} as const satisfies Record<Permission, AppRole>

function can(role: AppRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_LEVEL[role] >= ROLE_LEVEL[PERMISSION_LEVEL[permission]]
}
```

This is a smaller permissions matrix than the earlier `role → Permission[]` shape: each permission declares the *minimum* role it needs, once, instead of every role above it having to re-list it. `app/utils/permissions.ts` (§2) becomes `ROLE_LEVEL` + `PERMISSION_LEVEL`, not a `Record<AppRole, Permission[]>`.

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

**`user_roles`'s schema still allows multiple rows per user — the app-level single-role rule isn't enforced by the database yet.** The unique constraint is on `(user_id, role)`, not on `user_id` alone. Given the confirmed domain rule above, this is a real gap, the same shape as the P1 `pauperwave_associates` RLS issue elsewhere in this doc: an invariant the app assumes but Postgres doesn't actually guarantee. Tighten it as part of this work, not left for later:

- Check for existing users with more than one row in `user_roles` before adding any constraint (none expected under the new 4-role model, but confirm rather than assume).
- Change the constraint from `UNIQUE(user_id, role)` to `UNIQUE(user_id)`, so the database itself rejects a second role row for the same user instead of relying on `assign_role`/application code to remember the rule.

**Bootstrap data for `assign_role` (step 3 below), recorded 2026-08-10 so it isn't lost before the mechanism exists:**

| Person | Role |
|---|---|
| Emanuele Nardi | `super_admin` (**inferred, not stated explicitly** — earlier in this doc's history the user called themselves `admin`, before `super_admin`/role-management existed as a concept; since they're the one making role decisions here, `super_admin` fits, but confirm before applying) |
| Marco Cazzola | `organizer` |
| Lorenzo Castelli | `organizer` |
| Nicola Cordeschi | `organizer` |

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
3. Create `assign_role(uuid, app_role)` in Supabase (or document the existing mechanism, if promotion already happens some other way) — prerequisite for wiring `MembersList.vue`'s dropdown.
4. DB migration for the 4-role model, confirmed 2026-08-10 (§1): recreate the `app_role` enum without `judge` and with `super_admin` added (one type recreation covers both, after confirming no existing row uses `judge`), tighten `user_roles` from `UNIQUE(user_id, role)` to `UNIQUE(user_id)`, and apply the bootstrap role assignments (Emanuele Nardi → `super_admin`, unconfirmed — see §1; Marco Cazzola, Lorenzo Castelli, Nicola Cordeschi → `organizer`) — via `assign_role` from step 3, or by hand via SQL editor if that's not built yet.
5. `app/utils/permissions.ts` — `ROLE_LEVEL` + `PERMISSION_LEVEL` (§1) and the `Permission` type. Written first because everything else (the composable's `can()`, `definePageMeta({ permission })`, the middleware) reads from it.
6. `colada.options.ts` — add the `filter` exclusion for the role query key. **Mandatory, strictly before step 7** (confirmed 2026-08-10) — not "alongside," not "whenever it's convenient": the risk this closes (a stale/wrong role sitting in `localStorage` on a shared device) exists the moment `useUserRole()` starts calling `useQuery`, and the gap stops being visible in normal testing once the composable works, which is exactly when it'd stop getting fixed.
7. `app/composables/useUserRole.ts` — `useQuery`-backed on `get_user_role` (§1), `can`/`isOrganizer`/`isAdmin`/`isSuperAdmin`/`isStaff` on top of it.
8. `app/plugins/user-role.ts` — the `onAuthStateChange` → `queryCache.invalidateQueries` subscription (§4). Decide `.client.ts` vs. universal during this step, per the note in §4, rather than assuming either.
9. `app/types/nuxt.d.ts` — `PageMeta.permission` augmentation, so `definePageMeta({ permission: ... })` type-checks.
10. `app/middleware/authorization.global.ts` — reads `to.meta.permission`, `await useUserRole().refresh()` then `can()`, redirect to `/403` on denial. `app/middleware/auth.global.ts` stays as-is (session check only); the alphabetical filename ordering (`auth.` before `autho`) is what makes it run first — don't reorder or rename either file without re-checking that.
11. `/403` page — new, distinct from `/login`.
12. Wire `can()`/`isStaff` into `app/layouts/default.vue`'s `mainNavGroups` so a player's sidebar never shows sections they can't reach, and into the wanted-cards "Elimina" button (`docs/TODO.md`) as the first concrete `v-if="can(...)"` win, and into `MembersList.vue`'s promotion dropdown (step 3).
13. Go route by route deciding `permission` requirements and in-page `v-if` adaptation — `/standings/*` (already shared per ADR-011) first since no write path is involved, `/tournaments`/`/leagues`/`/events` after (needs the registration write decision — Postgres function vs. BFF — settled per the worked example above).
