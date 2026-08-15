-- supabase\migrations\20260815090000_add_wanted_cards_type_line.sql
-- Adds type_line (Scryfall's own field, e.g. "Land", "Creature — Elf
-- Wizard", "Legendary Artifact") to pauperwave_wanted_cards — needed to
-- tell a land apart from a colorless nonland card (artifact, colorless
-- creature/planeswalker), which color_identity alone can't distinguish
-- (both have an empty array). Backing the new color/land filter tabs on
-- /wanted-cards (user request 2026-08-15). Nullable: existing rows are
-- backfilled separately via scripts/backfill-wanted-cards-type-line.mjs,
-- not in this migration (no direct Scryfall access from a SQL migration).

alter table public.pauperwave_wanted_cards
  add column if not exists type_line text;
