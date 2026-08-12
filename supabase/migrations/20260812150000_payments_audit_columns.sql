-- Traceability for pauperwave_payments (user request, 2026-08-12): who created/
-- last edited a payment record and when. Every other domain table already has
-- this (pauperwave_associates, pauperwave_wanted_cards, events, players) —
-- payments was the one left out. Same pattern as
-- 20260808063237_wanted_cards_audit_columns.sql: created_by/updated_by
-- reference pauperwave_associates(uuid) directly (not auth.users), so "who" in
-- the UI is a plain join, never an admin-API call; public.set_updated_at() is
-- the existing generic trigger function, reused as-is.
alter table public.pauperwave_payments
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now(),
  add column created_by uuid references public.pauperwave_associates (uuid) on delete set null,
  add column updated_by uuid references public.pauperwave_associates (uuid) on delete set null;

create trigger set_payments_updated_at
  before update on public.pauperwave_payments
  for each row
  execute function public.set_updated_at();
