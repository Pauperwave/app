# Roles and permissions

<!-- docs/architecture/roles.md -->

How to give players a different (restricted, adapted) view of the same app the admin/organizer/judge staff uses, instead of a separate player app or a separate route tree. Written 2026-08-10, starting point requested by the user: `BACKUP CODICE APP/docs` (`1-roles.md`, `3-RLS-policies.md`), cross-checked against `docs/audits/2026-08-09-backup-docs-vs-live-schema.md` and the live generated types (`shared/utils/types/database.ts`) rather than trusted as-is — those backup docs are a design draft, not a description of what was built (see the audit's headline).

## What's actually live today

Confirmed via the audit + `shared/utils/types/database.ts` (generated from the real DB, never hand-edited):

- `app_role` enum: `admin | organizer | judge | player`, matches the backup docs exactly.
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

`app/composables/useUserRole.ts`, mirroring `useWantedCardsQuery.ts`'s shape exactly:

```ts
export const USER_ROLE_KEY = ['user-role']

export function useUserRole() {
  const supabase = useSupabaseClient()
  return useQuery({
    key: USER_ROLE_KEY,
    query: async () => {
      const user = useSupabaseUser()
      const { data, error } = await supabase.rpc('get_user_role', { p_user_id: user.value!.id })
      if (error) throw error
      return data
    }
  })
}
```

This retires almost the entire hand-rolled apparatus the first draft specified, because Colada's `useQuery` already provides it (confirmed against the installed package's own types, `node_modules/@pinia/colada/dist/index.d.mts`, not assumed):

- `status: ShallowRef<'pending' | 'success' | 'error'>` — the idle/loading/ready/error state, for free. `'pending'` covers both "not fetched yet" and "fetching" (there's a separate `isLoading`/`asyncStatus` for the latter if that distinction is ever needed); `can()` and the middleware should treat anything other than `status === 'success'` as "not yet decided," same as the old `null`-means-unresolved rule — just expressed through Colada's status instead of a custom one.
- `refresh(): Promise<DataState<...>>` — "ensures the current data is fresh; if stale, refetch, if not, return as is." This **is** `ensureRole()` — idempotent, awaitable, and its in-flight-request dedup is handled internally by the query cache. The entire multi-round debate earlier in this doc's history about `_pendingFetch` (module-level `let` vs. `useState` vs. `useNuxtApp()`) is moot: it was solving a problem a real query library already solves correctly as its core job. Nothing here needs a custom Promise-tracking variable.
- `data`/`error` — the resolved role and any fetch error, both reactive.

What's still genuinely custom, on top of the query:

- `can(permission: Permission)` and `isAdmin`/`isOrganizer`/`isJudge`/`isStaff` — computed helpers reading `data.value`, same purpose as before, just sourced from a Colada query's `data` instead of a hand-rolled `role` ref.

**Do not wrap this in a Pinia store (`defineStore`).** Nothing in this codebase does — every Colada-backed domain (`useWantedCardsQuery`/`useWantedCardsMutations`, and every other `use<Domain>Query.ts`) is a plain composable calling `useQuery`/`useMutation` directly, no store layer in between. A `useSessionStore` bundling user+role+profile together would be inconsistent with that convention for no benefit specific to this codebase: the "utente" part is already free via `useSupabaseUser()` (built into `@nuxtjs/supabase`), and "profilo" already has `useCurrentAssociate()` (not yet Colada-migrated, tracked separately in `docs/BACKLOG.md` P1 — a pre-existing, independent piece of work, not something to fold into this one). Three independent composables, combined at the call site where a component needs more than one, is the shape everything else in this app already uses.

**New finding, not covered by any earlier round of this doc: persistence.** ADR-009 (`docs/PROGRESS.md`) — every `useQuery` in this project persists to `localStorage` by default via `PiniaColadaCachePersister`, registered with no `filter` in `colada.options.ts` (confirmed: the file has no `filter` option today, so nothing is currently excluded). A role is exactly the "sensitive, must not persist" case ADR-009 itself names as the reason the `filter` option exists — without an explicit exclusion, a role fetched for one user could sit in `localStorage` and be visible (even briefly, before `refresh()` resolves) to a different person who logs into the same browser/device afterwards. **`useUserRole`'s query must be excluded via `colada.options.ts`'s `filter`** before or when this composable is built, not treated as an afterthought.

**Open question, not resolved yet: `user_roles` allows multiple rows per user.** The unique constraint is on `(user_id, role)`, not on `user_id` alone — a user can hold both `admin` and `organizer` simultaneously. `get_user_role(uuid)` returns a single scalar, so either it already picks one deterministically (e.g. an `ORDER BY` + `LIMIT 1` favoring the highest-privilege role — plausible, but unverified) or a multi-role user's effective permissions today are whatever that function happens to return, which may not be the union of both roles' permissions. `get_user_roles` (plural) is also confirmed live and looks like the actual answer to "give me all of this user's roles" — check what it does before building `can()` on the singular `get_user_role`. Deciding this after `can()` is built risks having to rewrite the permissions matrix from role-keyed to a role-set-keyed shape.

### 2. Route protection — `permission`, not a path allowlist

Reject the path-allowlist idea from the first draft of this doc. Instead, each page declares what it needs:

```ts
definePageMeta({ permission: 'manage-members' })
```

and a single **permissions matrix** (e.g. `app/utils/permissions.ts`) is the one place that maps `role → Permission[]`. Adding or renaming a route never touches the middleware; deciding "can a judge do X" is a one-line change in the matrix, not a search for scattered `role === 'judge'` checks. Requires augmenting Nuxt's `PageMeta` type so `permission` type-checks:

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

- `SIGNED_OUT` → `queryCache.invalidateQueries({ key: USER_ROLE_KEY })` (same `invalidate()` shape `useWantedCardsMutations.ts` already uses after a write)
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
| Role query persistence | Must be excluded via `colada.options.ts`'s `filter` (ADR-009) — sensitive, shared-device risk otherwise |
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
3. Create `assign_role(uuid, app_role)` in Supabase (or document the existing mechanism, if promotion already happens some other way) — prerequisite for wiring `MembersList.vue`'s dropdown. Also resolve the multi-role open question above (§1) here, since it's the same function family (`get_user_role`/`get_user_roles`) — check what each actually returns before deciding what `assign_role` should allow (e.g. can one user hold two roles at once through this UI, or does assigning a new one replace the old).
4. `app/utils/permissions.ts` — the `role → Permission[]` matrix and the `Permission` type. Written first because everything else (the composable's `can()`, `definePageMeta({ permission })`, the middleware) reads from it.
5. `colada.options.ts` — add the `filter` exclusion for the role query key *before or alongside* step 6, not after: easy to forget once the composable works and the persistence gap stops being visible in normal testing.
6. `app/composables/useUserRole.ts` — `useQuery`-backed (see §1), `can`/`isAdmin`/`isOrganizer`/`isJudge`/`isStaff` on top of it. Resolve the multi-role open question (§1) before finalizing `can()`'s shape.
7. `app/plugins/user-role.ts` — the `onAuthStateChange` → `queryCache.invalidateQueries` subscription (§4). Decide `.client.ts` vs. universal during this step, per the note in §4, rather than assuming either.
8. `app/types/nuxt.d.ts` — `PageMeta.permission` augmentation, so `definePageMeta({ permission: ... })` type-checks.
9. `app/middleware/authorization.global.ts` — reads `to.meta.permission`, `await useUserRole().refresh()` then `can()`, redirect to `/403` on denial. `app/middleware/auth.global.ts` stays as-is (session check only); the alphabetical filename ordering (`auth.` before `autho`) is what makes it run first — don't reorder or rename either file without re-checking that.
10. `/403` page — new, distinct from `/login`.
11. Wire `can()`/`isStaff` into `app/layouts/default.vue`'s `mainNavGroups` so a player's sidebar never shows sections they can't reach, and into the wanted-cards "Elimina" button (`docs/TODO.md`) as the first concrete `v-if="can(...)"` win, and into `MembersList.vue`'s promotion dropdown (step 3).
12. Go route by route deciding `permission` requirements and in-page `v-if` adaptation — `/standings/*` (already shared per ADR-011) first since no write path is involved, `/tournaments`/`/leagues`/`/events` after (needs the registration write decision — Postgres function vs. BFF — settled per the worked example above).
