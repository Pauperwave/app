-- supabase\migrations\20260816130000_add_locations_opening_hours.sql
-- Weekly opening hours per location (user request, 2026-08-16) — a JSONB
-- column rather than a separate day-of-week table: the shape is a fixed
-- 7-key object (monday..sunday), each either null (closed) or
-- { open, close } (HH:mm strings), never queried/filtered on its own, only
-- read/written whole alongside the rest of the location row.
alter table public.locations
  add column opening_hours jsonb;
