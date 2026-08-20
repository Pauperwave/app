-- Backing table for the "Cronologia accessi" section on the player detail
-- page (app/pages/(community)/players/[playerId]/index.vue, 2026-08-20 user
-- request). Follows a Supabase-specialist-validated recommendation after
-- comparing options (see the conversation this migration was written from):
-- a trigger on auth.audit_log_entries filtering payload->>'action' = 'login'
-- is real-time, needs no extra infrastructure (Postgres audit-log storage
-- is already active on this project — confirmed via a live query showing
-- 74 existing 'login' rows, distinct from 'token_refreshed'/'token_revoked'),
-- and uses Supabase's own documented action taxonomy. Rejected alternatives:
-- client-triggered logging from auth/callback.vue (best-effort, silently
-- lost if the tab closes before the request completes, and coupled to every
-- sign-in continuing to route through that one page); the
-- custom_access_token hook (fires on every token refresh too, not just real
-- sign-ins, without extra filtering); a batch job copying from
-- audit_log_entries (adds lag for no benefit here).
--
-- Append-only log, no soft-delete (deleted_at) — nothing here is ever
-- edited or user-facing-deletable, unlike the tables ADR-017 covers.

create table public.player_login_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_in_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_player_login_history_user_id_logged_in_at
  on public.player_login_history (user_id, logged_in_at desc);

-- SECURITY DEFINER: the trigger fires on an auth.* table (RLS/ownership
-- there is not public.*'s concern) and needs to write into public.* from
-- inside that context.
create function public.log_player_login()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.payload->>'action' = 'login' then
    insert into public.player_login_history (user_id, logged_in_at)
    values ((new.payload->>'actor_id')::uuid, new.created_at);
  end if;
  return new;
end;
$function$;

create trigger log_player_login_on_audit_entry
  after insert on auth.audit_log_entries
  for each row
  execute function public.log_player_login();

alter table public.player_login_history enable row level security;

-- Same permission as the /players page itself (view-players, organizer+,
-- app/utils/permissions.ts) — no reason for the login history to be more
-- restricted than the roster it belongs to.
create policy "Management can read player login history"
  on public.player_login_history
  for select
  to authenticated
  using (public.has_management_permissions(auth.uid()));
