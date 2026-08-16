-- supabase\migrations\20260816200000_add_mtg_formats_deleted_at.sql
-- Soft delete for mtg_formats (user request, 2026-08-16) — deleting a format
-- was a hard row delete, which only worked at all because
-- fk_tournaments_format_uuid_fkey rejects it while any tournament still
-- references the row (ManageModal.vue disables the delete button up front
-- for the same reason). A format used by a past tournament should still be
-- deletable from the active list without breaking that tournament's own FK
-- or losing its format name — same convention as tournaments/pauperwave_
-- associates/pauperwave_payments' own deleted_at columns.
alter table public.mtg_formats
  add column deleted_at timestamptz;
