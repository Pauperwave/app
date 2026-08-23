-- supabase\migrations\20260823150000_add_comped_payment_method.sql
-- Adds 'Comped' (complimentary/free entry, no money changed hands) to
-- ck_payment_method, needed to import the historical 2026 receipts sheet
-- where free tournament/event entries were logged as method "Altro".
-- Displayed in the UI as "Omaggio" (Italian label), same convention as the
-- other payment methods (English enum value, Italian display label).
alter table public.pauperwave_payments
  drop constraint ck_payment_method;

alter table public.pauperwave_payments
  add constraint ck_payment_method check (
    payment_method = any (array['PayPal'::text, 'POS'::text, 'Cash'::text, 'Comped'::text])
  );
