-- supabase\migrations\20260816190000_uppercase_mtg_formats_color.sql
-- 20260816180000_add_mtg_formats_color.sql seeded lowercase hex ('#84cc16'),
-- but UColorPicker's own ColorTranslator always emits uppercase ('#84CC16')
-- once a user repicks a color from ManageModal.vue — normalizes the seed
-- values to match, so every row is uppercase consistently (user request,
-- 2026-08-16).
update public.mtg_formats
set color = upper(color)
where color is not null;
