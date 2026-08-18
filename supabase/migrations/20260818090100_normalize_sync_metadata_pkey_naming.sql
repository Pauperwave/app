-- Missed in the previous migration (20260818090000) — sync_metadata's
-- primary key (on table_name, not the usual id) was overlooked when
-- compiling the list of drifted constraint names.
ALTER TABLE public.sync_metadata RENAME CONSTRAINT sync_metadata_pkey TO pk_sync_metadata;
