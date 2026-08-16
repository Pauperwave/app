-- supabase\migrations\20260816140000_add_locations_social_links.sql
-- Social links per location (user request, 2026-08-16) — same
-- "just a URL, no validation beyond optional-string" convention as
-- website/google_maps_url.
alter table public.locations
  add column facebook_url text,
  add column instagram_url text,
  add column telegram_url text;
