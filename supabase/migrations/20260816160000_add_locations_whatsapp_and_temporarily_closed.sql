-- supabase\migrations\20260816160000_add_locations_whatsapp_and_temporarily_closed.sql
-- Community WhatsApp link (user request, 2026-08-16) — same convention as
-- facebook_url/instagram_url/telegram_url.
-- temporarily_closed: a simple boolean flag, not a date range — locations
-- don't currently track a reopening date, this only drives a "chiuso
-- temporaneamente" badge on the card and disables (without clearing) the
-- opening-hours editor.
alter table public.locations
  add column whatsapp_url text,
  add column temporarily_closed boolean not null default false;
