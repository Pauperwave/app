-- supabase\migrations\20260902195719_add_events_image_card_attribution.sql
-- Mirrors tournaments' image_card_name/image_card_artist (migration
-- 20260820120000) — required alongside any Scryfall art_crop use per
-- Scryfall's API usage guidelines, previously missing here entirely so
-- events/list/Cover.vue could never show an attribution chip even when
-- image was set (user request, 2026-09-02: reuse the same attribution UI
-- tournaments already has).
alter table public.events
  add column image_card_name text,
  add column image_card_artist text;
