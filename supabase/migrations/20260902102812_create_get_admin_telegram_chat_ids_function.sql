-- supabase\migrations\20260902102812_create_get_admin_telegram_chat_ids_function.sql
-- Single-query replacement for notifyTelegramAdmins()'s three round-trips
-- (user_roles -> players -> pauperwave_associate_telegram_links). Needed as
-- a function rather than a plain PostgREST nested select because
-- user_roles.user_id and players.user_id both reference auth.users
-- independently — there's no FK between the two tables for PostgREST to
-- embed across.
create or replace function public.get_admin_telegram_chat_ids()
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select links.chat_id
  from public.user_roles ur
  join public.players p on p.user_id = ur.user_id
  join public.pauperwave_associate_telegram_links links on links.associate_uuid = p.associate_uuid
  where ur.role in ('admin', 'super_admin');
$$;
