-- supabase\migrations\20260902104024_parameterize_get_admin_telegram_chat_ids_by_role.sql
-- Two notification channels share the same join, only the role filter
-- differs: domain events (new tesseramento request, renewal request) go to
-- admin+super_admin, technical errors go to super_admin only so there's a
-- single point of accountability for intervening promptly (user request,
-- 2026-09-02). Parameterizing avoids a byte-identical second function.
create or replace function public.get_admin_telegram_chat_ids(
  p_roles public.app_role[] default array['admin', 'super_admin']::public.app_role[]
)
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
  where ur.role = any(p_roles);
$$;
