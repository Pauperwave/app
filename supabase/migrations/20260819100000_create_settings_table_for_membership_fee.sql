-- Backing table for /settings' new "Quota associativa" section (user request,
-- 2026-08-19): MEMBERSHIP_FEE_AMOUNT/MEMBERSHIP_FEE_PAYMENT_METHOD
-- (app/utils/associates/membershipFee.ts) were hardcoded constants — flagged
-- as a known TODO the moment they were extracted (docs/TODO.md, 2026-08-12)
-- with an eye towards exactly this. Singleton table (a single row, id pinned
-- to 1 via CHECK) rather than a generic key-value settings table — there's
-- only this one association-wide rule to persist so far, see docs/TODO.md's
-- own note about generalizing once a second one shows up.

-- Missing alongside is_admin/is_super_admin/has_management_permissions
-- (20260817090000) — none of those three express "admin or higher" (is_admin
-- is strictly the 'admin' role, has_management_permissions also includes
-- 'organizer'). Defined before the policies below that need it.
create function public.is_admin_or_above(p_user_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role in ('admin', 'super_admin')
  );
$function$;

create table public.pauperwave_settings (
  id smallint primary key default 1,
  membership_fee_amount numeric(10, 2) not null default 5,
  membership_fee_payment_method text not null default 'PayPal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.pauperwave_associates (uuid) on delete set null,
  constraint ck_settings_singleton check (id = 1),
  constraint ck_membership_fee_payment_method check (membership_fee_payment_method in ('Cash', 'PayPal', 'POS'))
);

insert into public.pauperwave_settings (id) values (1);

create trigger set_settings_updated_at
  before update on public.pauperwave_settings
  for each row
  execute function public.set_updated_at();

alter table public.pauperwave_settings enable row level security;

-- Every associate (not just staff) can read it — same "read is open" reasoning
-- as pauperwave_wanted_cards' own select policy; nothing sensitive in it.
create policy "Authenticated users can read settings"
  on public.pauperwave_settings
  for select
  to authenticated
  using (true);

-- Financial/bylaw value — admin or above, not just management (organizer
-- excluded), matching the 'manage-membership-fees' permission
-- (app/utils/permissions.ts) already reserved for this. RLS here is
-- defense-in-depth, not the real boundary — the server/api/settings/*
-- endpoint's requireAdminPermission check is (server/utils/serverAuth.ts).
create policy "Admins can update settings"
  on public.pauperwave_settings
  for update
  to authenticated
  using (public.is_admin_or_above(auth.uid()))
  with check (public.is_admin_or_above(auth.uid()));
