-- supabase\migrations\20260827100000_add_associate_membership_events.sql
-- pauperwave_associates is a single mutable row per person with no history —
-- everything except request_date (immutable) and the payment-driven
-- pauperwave_associate_renewals table gets silently overwritten on the next
-- status change. This append-only table logs the 4 membership-lifecycle
-- moments the associate detail page's timeline needs (user request,
-- 2026-08-27): first request, first approval, each renewal request, each
-- renewal approval.
create table public.pauperwave_associate_membership_events (
  id bigint generated always as identity primary key,
  associate_uuid uuid not null references public.pauperwave_associates(uuid) on delete cascade,
  event_type text not null check (event_type in ('requested', 'approved', 'renewal_requested', 'renewal_approved')),
  occurred_at timestamptz not null default now()
);

create index pauperwave_associate_membership_events_associate_uuid_idx
  on public.pauperwave_associate_membership_events (associate_uuid, occurred_at);

alter table public.pauperwave_associate_membership_events enable row level security;

-- Same RLS shape as pauperwave_associate_renewals: staff sees/writes
-- everything, a player only ever sees their own events.
create policy management_full_access on public.pauperwave_associate_membership_events
  for all
  using (has_management_permissions(auth.uid()))
  with check (has_management_permissions(auth.uid()));

create policy player_own_membership_events on public.pauperwave_associate_membership_events
  for select
  using (associate_uuid = (select associate_uuid from players where user_id = auth.uid()));
