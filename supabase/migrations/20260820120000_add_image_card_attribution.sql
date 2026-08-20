-- supabase\migrations\20260820120000_add_image_card_attribution.sql
-- Cover images (tournaments.image_url/leagues.image_url) are Scryfall
-- art_crop illustrations picked via MagicCardArtPicker.vue — Scryfall's API
-- usage guidelines require the artist name and copyright to be shown
-- alongside any art_crop use, since the crop itself carries no in-image
-- attribution (unlike the full card, which has the artist credit printed on
-- it). These two columns capture that at selection time, so the app can
-- render it wherever the crop is shown (the picker itself and the cover's
-- own card/detail-page overlay), rather than re-deriving it from the image
-- URL later. Nullable: existing rows have neither, and a cover can still be
-- unset entirely.
alter table public.tournaments
  add column image_card_name text,
  add column image_card_artist text;

alter table public.leagues
  add column image_card_name text,
  add column image_card_artist text;
