-- supabase\migrations\20260823100000_add_locations_deleted_at.sql
-- Soft delete for locations (user request, 2026-08-23) — locations has
-- create/update endpoints and a management page (/locations) but no delete
-- flow at all yet. A location can be referenced by past tournaments/events
-- (location_uuid FK), so a hard delete would either be rejected by the FK
-- while any history references it, or destroy that history if the FK were
-- ON DELETE SET NULL — same reasoning as mtg_formats' own soft delete
-- (20260816200000_add_mtg_formats_deleted_at.sql).
alter table public.locations
  add column deleted_at timestamptz;
