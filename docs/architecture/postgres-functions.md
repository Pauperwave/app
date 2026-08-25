# Postgres functions

Every function currently defined in the `public` schema, grouped by purpose. Pulled live from the database (`pg_proc`), not from migration history — some of these were added, then altered in place by a later migration, so this reflects what's actually running today, not the original `create function` statement.

Most are `SECURITY DEFINER` — they run with the privileges of the function's owner rather than the calling user, which is what lets RLS-restricted tables (like `user_roles`) be checked from inside a policy without granting the caller direct read access. All of them pin `search_path = public`, a security hardening convention that stops a caller with a different session `search_path` from tricking the function into resolving an unqualified table name to some other schema.

## Table of contents

- [Roles & permissions](#roles--permissions)
  - [`get_user_role`](#get_user_rolep_user_id-uuid-returns-app_role)
  - [`get_user_roles`](#get_user_roles_user_id-uuid-returns-app_role)
  - [`has_role`](#has_role_user_id-uuid-_role-app_role-returns-boolean)
  - [`is_admin`](#is_adminp_user_id-uuid-returns-boolean)
  - [`is_admin_or_above`](#is_admin_or_abovep_user_id-uuid-returns-boolean)
  - [`is_super_admin`](#is_super_adminp_user_id-uuid-returns-boolean)
  - [`is_organizer`](#is_organizer_user_id-uuid-returns-boolean)
  - [`has_management_permissions`](#has_management_permissionsp_user_id-uuid-returns-boolean)
  - [`assign_role`](#assign_rolep_user_id-uuid-p_role-app_role-returns-void)
- [Tournament registration](#tournament-registration)
  - [`register_tournament_players`](#register_tournament_playersp_tournament_uuid-uuid-p_associate_uuids-uuid-p_status-text-default-registered-returns-table-)
- [Auditing & housekeeping](#auditing--housekeeping)
  - [`log_player_login`](#log_player_login-returns-trigger)
  - [`purge_expired_trash`](#purge_expired_trash-returns-void)
  - [`set_updated_at`](#set_updated_at-returns-trigger)
  - [`set_wanted_card_found_at`](#set_wanted_card_found_at-returns-trigger)

## Roles & permissions

These back the app's role system (`player` / `organizer` / `admin` / `super_admin`, stored in `user_roles`) and the RLS policies that gate management actions.

### `get_user_role(p_user_id uuid) returns app_role`

```sql
SELECT COALESCE(
  (SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1),
  'player'
);
```

Returns a user's single role, defaulting to `'player'` if they have no `user_roles` row at all — this is what makes "no row" and "explicitly a player" equivalent everywhere else in the schema.

### `get_user_roles(_user_id uuid) returns app_role[]`

```sql
select array_agg(role)
from public.user_roles
where user_id = _user_id
```

Plural variant returning every role row for a user as an array, rather than assuming one row per user like `get_user_role` does.

### `has_role(_user_id uuid, _role app_role) returns boolean`

Checks whether a user has one specific role. The general-purpose building block `is_admin`, `is_organizer`, etc. are thin wrappers or duplicates of the same `EXISTS` shape over `user_roles`.

### `is_admin(p_user_id uuid) returns boolean`

`role = 'admin'` exactly — does not include `super_admin`. Use `is_admin_or_above` when a super admin should also pass.

### `is_admin_or_above(p_user_id uuid) returns boolean`

`role in ('admin', 'super_admin')`.

### `is_super_admin(p_user_id uuid) returns boolean`

`role = 'super_admin'` exactly.

### `is_organizer(_user_id uuid) returns boolean`

```sql
select public.has_role(_user_id, 'organizer')
```

Delegates to `has_role` rather than duplicating the `EXISTS` query — the one role-check that's a thin wrapper instead of its own inline query.

### `has_management_permissions(p_user_id uuid) returns boolean`

```sql
SELECT EXISTS (
  SELECT 1
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND role IN ('admin', 'organizer', 'super_admin')
);
```

The broadest check — anyone with staff-level access to run tournaments (not just `admin`/`super_admin`, `organizer` too). This is what `requireManagementPermission(event)` calls server-side to gate every write endpoint under `server/api/`.

### `assign_role(p_user_id uuid, p_role app_role) returns void`

```sql
CREATE OR REPLACE FUNCTION public.assign_role(p_user_id uuid, p_role app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_current_role public.app_role;
  target_locked boolean;
BEGIN
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT role, role_locked INTO target_current_role, target_locked
    FROM public.user_roles WHERE user_id = p_user_id;

  IF target_locked THEN
    RAISE EXCEPTION 'This user''s role cannot be changed';
  END IF;

  IF NOT public.is_super_admin(auth.uid()) THEN
    IF p_role = 'super_admin' OR target_current_role = 'super_admin' THEN
      RAISE EXCEPTION 'Only a super_admin can grant or modify the super_admin role';
    END IF;
  END IF;

  IF p_role = 'player' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END;
$function$
```

The write path for role changes — everything above this is read-only checks, this is the one function that mutates `user_roles`. Guards, in order:

1. The caller (`auth.uid()`) must be at least an `admin` — plain `organizer`s can't touch roles at all.
2. The target user's role must not be `role_locked` (a flag added so specific accounts, e.g. the account owner, can't have their role changed by anyone, including other admins).
3. Only a `super_admin` can grant `super_admin`, or change the role of an existing `super_admin` — an `admin` can promote/demote everyone else, but can't touch or create another `super_admin`.
4. Assigning `'player'` deletes the `user_roles` row entirely (since `get_user_role`'s `COALESCE` already treats "no row" as `'player'` — no need to store the default explicitly); any other role is an upsert.

## Tournament registration

### `register_tournament_players(p_tournament_uuid uuid, p_associate_uuids uuid[], p_status text default 'registered') returns table (...)`

```sql
CREATE OR REPLACE FUNCTION public.register_tournament_players(
  p_tournament_uuid uuid, p_associate_uuids uuid[], p_status text DEFAULT 'registered'::text
)
 RETURNS TABLE(
   registration_uuid uuid, status text, created_at timestamptz,
   checked_in_at timestamptz, associate_uuid uuid
 )
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  insert into players (associate_uuid)
  select a
  from unnest(p_associate_uuids) as a
  on conflict (associate_uuid) do nothing;

  insert into tournament_registrations (tournament_uuid, player_uuid, status, checked_in_at)
  select p_tournament_uuid, pl.uuid, p_status,
         case when p_status = 'checked_in' then now() else null end
  from players pl
  where pl.associate_uuid = any(p_associate_uuids)
  on conflict (player_uuid, tournament_uuid) do nothing;

  return query
  select tr.uuid, tr.status, tr.created_at, tr.checked_in_at, pl.associate_uuid
  from tournament_registrations tr
  join players pl on pl.uuid = tr.player_uuid
  where tr.tournament_uuid = p_tournament_uuid
    and pl.associate_uuid = any(p_associate_uuids);
end;
$function$
```

Called via `supabase.rpc(...)` from `server/api/tournament-registrations/register.post.ts`. Registers a batch of associates for a tournament atomically, in one round-trip — replacing what used to be several separate, non-transactional Supabase client calls.

- **Step 1 — get-or-create `players` rows.** `players` represents "the associate during tournaments" (decks/stats hang off it), and most associates don't have a row there yet. `unnest()` turns the incoming UUID array into a set of rows, one per associate, and inserts a `players` row for any that's missing one. `on conflict ... do nothing` makes this idempotent.
- **Step 2 — insert the registrations.** Now that every associate is guaranteed a `players` row (same transaction), this resolves each associate's `player_uuid` and inserts one `tournament_registrations` row per associate for this tournament. `checked_in_at` is set to `now()` only when registering straight as checked-in (walk-ins); otherwise `null`. `on conflict ... do nothing` again — re-running this for someone already registered is a no-op, not an error.
- **Step 3 — return what was created/already existed.** Reads back the registrations for exactly this tournament + this batch of associates and returns them joined with `associate_uuid`, so the client's `TournamentRegistration[]` cache can be updated directly without a second fetch.

Not `SECURITY DEFINER` (unlike the role functions above) — it relies on the caller's own privileges, since it's invoked from a server endpoint that already authenticates via `serverSupabaseServiceRole` and gates on `requireManagementPermission`.

**Why an RPC at all:** the Supabase JS client can't run multiple statements in one transaction — each `.from(...).insert(...)` is its own round-trip. Wrapping all three steps in one `plpgsql` function makes Postgres run them as a single transaction: if step 2 failed partway through, step 1's `players` inserts wouldn't be left dangling half-applied.

## Auditing & housekeeping

### `log_player_login() returns trigger`

```sql
begin
  if new.payload->>'action' = 'login' then
    insert into public.player_login_history (user_id, logged_in_at)
    values ((new.payload->>'actor_id')::uuid, new.created_at);
  end if;
  return new;
end;
```

A trigger function on Supabase Auth's audit log table — fires on every row, but only writes to `player_login_history` when the row's JSON `payload` marks the event as a `'login'`. Extracts the acting user's id out of the JSON payload rather than a dedicated column, since that's the shape Supabase's own audit table uses.

### `purge_expired_trash() returns void`

```sql
declare
  cutoff timestamptz;
begin
  select now() - (trash_retention_days || ' days')::interval
    into cutoff
    from public.pauperwave_settings
    where id = 1;

  delete from public.mtg_formats where deleted_at < cutoff;
  delete from public.tournaments where deleted_at < cutoff;
  delete from public.leagues where deleted_at < cutoff;
  delete from public.events where deleted_at < cutoff;
  delete from public.pauperwave_payments where deleted_at < cutoff;
  delete from public.pauperwave_wanted_cards where deleted_at < cutoff;
  delete from public.locations where deleted_at < cutoff;
end;
```

Scheduled (via `pg_cron`, set up in the `schedule_expired_trash_purge` migration) hard-deletion of soft-deleted rows past their retention window. `trash_retention_days` is a configurable setting (`pauperwave_settings`, single row, `id = 1`) rather than a hardcoded interval, so the retention period can change without a migration. Every soft-deletable table in the schema gets its own `delete ... where deleted_at < cutoff` line — a new soft-deletable table needs to be added here explicitly, it isn't picked up automatically.

### `set_updated_at() returns trigger`

```sql
begin
  new.updated_at = now();
  return new;
end;
```

Generic `BEFORE UPDATE` trigger — stamps `updated_at` on any table it's attached to. Not `SECURITY DEFINER` and no `search_path` pin, since it touches only `NEW`/`OLD` row data, never queries another table.

### `set_wanted_card_found_at() returns trigger`

```sql
begin
  if new.status = 'found' and old.status <> 'found' then
    new.found_at := now();
  elsif new.status <> 'found' then
    new.found_at := null;
  end if;
  return new;
end;
```

`BEFORE UPDATE` trigger on `pauperwave_wanted_cards`: stamps `found_at` the moment `status` transitions into `'found'`, and clears it back to `null` if the status ever moves away from `'found'` again (e.g. a mis-click getting corrected) — so `found_at` can't go stale pointing at a status the row no longer has.
