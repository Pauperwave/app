-- supabase\migrations\20260816150000_fix_organizations_pauperwave_casing.sql
-- Branding casing fix (user request, 2026-08-16): "PauperWave" -> "Pauperwave"
-- everywhere, including the seeded organizations row from
-- 20260815100500_seed_hobbit_draft.sql (left untouched — an applied
-- migration is a historical record, not something to edit after the fact).
update public.organizations
  set name = 'Pauperwave'
  where name = 'PauperWave';
