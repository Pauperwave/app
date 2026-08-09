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

## Proposed pattern — three layers, only one of them is real security

1. **Client role resolution** — new composable, e.g. `useUserRole()`, wrapping `get_user_role(uuid)` via `supabase.rpc(...)` (mirrors `serverAuth.ts`'s use of `has_management_permissions`, same RPC-not-raw-select approach, so it doesn't depend on `user_roles` having a working self-read RLS policy — the backup docs disagree with each other on whether that policy exists, see `1-roles.md` vs `3-RLS-policies.md`). Cache it the same way `useCurrentAssociate.ts` caches associate lookup — resolved once per session, not re-fetched per page.
2. **Route/nav gating** — routes that must be fully inaccessible to players get an explicit allowlist/denylist check (extend `auth.global.ts` or add a sibling middleware), and `app/layouts/default.vue`'s `mainNavGroups` gets filtered by role so a player's sidebar never shows sections they can't use. Explicit list, not an inferred one — a new admin-only route must be added deliberately, the same reasoning `auth.global.ts`'s `publicPages` allowlist already uses for the opposite case.
3. **In-page adaptation** — on routes that stay shared, components branch on the resolved role: hide edit/delete affordances, swap "all associates" for "my own record," etc. This is where the wanted-cards "Elimina" TODO gets resolved — swap its current "let it fail server-side" behavior for `v-if` on the role.

Layers 2 and 3 are UX. Layer 0, not listed above because it already exists, is the actual enforcement: RLS policies + `requireManagementPermission`-style BFF checks. Any new player-facing write path needs the same BFF treatment `wanted-cards` already has (`server/utils/serverAuth.ts`), not a direct client → Supabase write.

## Wider roadmap (context, not scoped now)

`BACKUP CODICE APP/docs/blog.md` is superseded on the blog itself (blog is now a separate Nuxt Content repo, not part of this project), but its "funzionalità future per gli associati" list is still a reasonable shape for where the player area eventually goes: tournament pre-registration, commander deck submission, payment/membership-renewal history, event participation stats. None of this is scoped or estimated — recorded here so it isn't lost a second time, to be broken down into `docs/BACKLOG.md`/`docs/TODO.md` items individually as each is actually picked up.

## Suggested order of work

1. Decide and resolve the `pauperwave_associates` P1 policy (`docs/BACKLOG.md`) — not a hard blocker for starting layers 1-3, but "player can't see other members' PII" stays false until it's fixed.
2. Confirm whether `public_read` was applied to `tournaments`/`tournament_standings`/`players` (audit §5.5) — changes what's already safe to read as a player vs. what still needs a BFF.
3. Build `useUserRole()` (layer 1) — smallest independent piece, nothing else depends on it existing first but everything else depends on it existing eventually.
4. Wire it into `auth.global.ts`/nav filtering (layer 2) for the routes that are unambiguously admin-only.
5. Go route by route deciding "hidden entirely" vs. "shared, adapted content" (layer 3) — starting with `/standings/*` (already shared per ADR-011) and the wanted-cards "Elimina" TODO as the first concrete win.
