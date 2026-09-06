-- supabase\migrations\20260823150749_restart_payments_id_sequence_at_698.sql
-- Recovered from supabase_migrations.schema_migrations (2026-09-06) — this
-- migration was applied to the remote project but had no corresponding
-- local file, discovered while reconciling a local/remote migration-history
-- timestamp drift (see resequence_payments_id_from_1.sql, applied moments
-- earlier). Re-running the same `restart with 698` as a standalone
-- follow-up, harmless/idempotent since it just resets the sequence's next
-- value again.
alter table public.pauperwave_payments
  alter column id restart with 698;
