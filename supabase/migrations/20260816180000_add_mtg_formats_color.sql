-- supabase\migrations\20260816180000_add_mtg_formats_color.sql
-- Makes format colors user-editable from mtgFormats/ManageModal.vue's new
-- UColorPicker (user request, 2026-08-16) — previously hardcoded in
-- shared/utils/formatColors.ts, keyed by format name, never stored in the
-- DB. Backfills the existing formats with the hex equivalent of the
-- semantic token they already used (app/app.config.ts: primary=indigo,
-- secondary=pink, neutral=zinc, success=lime, info=cyan, warning=yellow,
-- error=rose -500 shades; Cubo Commander had no semantic token, violet-500),
-- so nothing visibly changes until someone picks a new color. Nullable: a
-- new format with no color falls back to formatColorClass()'s neutral
-- default, same as before this column existed.
alter table public.mtg_formats
  add column color text;

update public.mtg_formats set color = case name
  when 'Commander' then '#6366f1'
  when 'Cubo Commander' then '#8b5cf6'
  when 'Cubo Vintage' then '#ec4899'
  when 'Draft' then '#84cc16'
  when 'Sealed' then '#f43f5e'
  when 'Premodern' then '#eab308'
  when 'Oldschool' then '#71717a'
  when 'Pauper' then '#06b6d4'
  else null
end
where color is null;
