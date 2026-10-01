-- supabase\migrations\20261001150000_add_tournament_is_test.sql
-- Test tournaments (user request, 2026-10-01): visible only to super_admin, hidden from everyone else
-- (including admins/organizers, the public calendar and the bot's discovery commands, which read through
-- RLS). Enforced here rather than in the app, since the app only ever filters what RLS already returned.
alter table public.tournaments
  add column is_test boolean not null default false;

drop policy public_read on public.tournaments;
create policy public_read on public.tournaments
  for select
  using (deleted_at is null and (not is_test or public.is_super_admin(auth.uid())));

drop policy management_full_access on public.tournaments;
create policy management_full_access on public.tournaments
  for all
  using (
    public.has_management_permissions(auth.uid())
    and (not is_test or public.is_super_admin(auth.uid()))
  )
  with check (
    public.has_management_permissions(auth.uid())
    and (not is_test or public.is_super_admin(auth.uid()))
  );
