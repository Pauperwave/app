-- supabase\migrations\20260816130500_add_locations_image_url.sql
-- Optional cover image per location (user request, 2026-08-16), shown on the
-- /locations grid card — same "just a URL, no upload UI" convention as
-- tournaments.image_url (never exposed in TournamentsListAddModal.vue
-- either, only ever set directly against the DB).
alter table public.locations
  add column image_url text;
