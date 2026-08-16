-- supabase\migrations\20260816170000_seed_mtg_formats.sql
-- mtg_formats had a single seeded row ('Draft', from
-- 20260815100500_seed_hobbit_draft.sql) — everywhere else in the app the
-- format dropdown was effectively unusable. Seeds the rest of the formats
-- the association actually runs, per CITTADINO_FORMATS
-- (app/utils/cittadinoFormats.ts, confirmed by the user 2026-08-09). No
-- unique constraint on mtg_formats.name to rely on, so each insert is
-- guarded by a NOT EXISTS check instead of ON CONFLICT.
insert into public.mtg_formats (name)
select name from (values
  ('Commander'),
  ('Cubo Commander'),
  ('Cubo Vintage'),
  ('Sealed'),
  ('Premodern'),
  ('Pauper'),
  ('Oldschool')
) as v(name)
where not exists (
  select 1 from public.mtg_formats where mtg_formats.name = v.name
);
