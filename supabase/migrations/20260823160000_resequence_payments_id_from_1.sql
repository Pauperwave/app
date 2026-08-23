-- supabase\migrations\20260823160000_resequence_payments_id_from_1.sql
-- pauperwave_payments.id (bigint identity) started at 3, not 1 -- two values
-- were burned by inserts that never persisted (identity sequences don't
-- reuse rollback/deleted values) before the 2026 historical import ran.
-- Nothing else FKs on id (payment_receipts references uuid, not id -- see
-- docs/supabase/2-database.md), so it's safe to shift every row down by 2 and
-- restart the sequence, closing the gap. ALTER CONSTRAINT ... DEFERRABLE only
-- applies to foreign keys in Postgres, so the PK is dropped/recreated instead
-- of deferred -- the shift itself can't collide (it's a bijection preserving
-- distinctness), so there's no window where uniqueness is actually at risk.
alter table public.pauperwave_payments
  drop constraint pk_pauperwave_payments_pkey;

update public.pauperwave_payments set id = id - 2;

alter table public.pauperwave_payments
  add constraint pk_pauperwave_payments_pkey primary key (id);

alter table public.pauperwave_payments
  alter column id restart with 698;
