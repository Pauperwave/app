-- Restores `received_by` from the original table design (docs/2-database.md in
-- the BACKUP CODICE APP repo, `received_by text not null`) — dropped somewhere
-- between that design and the live schema, then rebuilt as a UI-only mock field
-- with no column behind it (transactions/list/AddModal.vue, until 2026-08-12).
-- Added nullable first, backfilled, then set NOT NULL: the safe two-step
-- pattern for a NOT NULL column on a table that already has rows.
alter table public.pauperwave_payments
  add column received_by text null;

update public.pauperwave_payments
  set received_by = 'Non specificato'
  where received_by is null;

alter table public.pauperwave_payments
  alter column received_by set not null;
