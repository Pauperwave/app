-- supabase\migrations\20260816210000_soft_delete_payments_and_wanted_cards.sql
-- Extends the mtg_formats/tournaments soft-delete convention (deleted_at,
-- see 20260816200000) to the two remaining hard-delete endpoints in the app
-- (user request, 2026-08-16): pauperwave_payments and pauperwave_wanted_cards.
-- Their own useQuery composables filter `is('deleted_at', null)`.
alter table public.pauperwave_payments
  add column deleted_at timestamptz;

alter table public.pauperwave_wanted_cards
  add column deleted_at timestamptz;
