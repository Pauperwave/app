-- Magman (a shop, not Pauperwave) tracked as an organizer for schedule
-- comparison only (user request, 2026-09-04) — see isExternalOrganizer in
-- server/utils/telegram/commands/tournament/detail.ts and RegisterButton.vue:
-- these tournaments show up for visibility but never offer registration.
-- Modern and 2HG are genuine general-purpose formats (not shop-scoped, per
-- user correction), added globally alongside the existing ones.
-- location_uuid assumes a 'Magman' row in public.locations already exists
-- (created manually by the user, 2026-09-04, Trento).

insert into public.organizations (name, type)
values ('Magman', 'shop');

insert into public.mtg_formats (name)
values ('Modern'), ('2HG');

insert into public.tournaments (name, status, format_uuid, location_uuid, organizer_uuid, starts_at)
select
  t.name,
  'external',
  (select uuid from public.mtg_formats where name = t.format_name),
  (select uuid from public.locations where name = 'Magman'),
  (select uuid from public.organizations where name = 'Magman'),
  (t.starts_at_local at time zone 'Europe/Rome')
from (values
  ('Casual commander multiplayer', 'Commander', '2026-07-21 20:00'::timestamp),
  ('Commander party', 'Commander', '2026-07-24 20:00'::timestamp),
  ('Casual modern', 'Modern', '2026-07-28 20:00'::timestamp),
  ('Torneo modern', 'Modern', '2026-07-31 20:00'::timestamp),
  ('Casual commander multiplayer', 'Commander', '2026-08-04 20:00'::timestamp),
  ('Prerelease The Hobbit', 'Sealed', '2026-08-07 20:00'::timestamp),
  ('Prerelease The Hobbit', 'Sealed', '2026-08-11 20:00'::timestamp),
  ('Release draft - The Hobbit', 'Draft', '2026-08-18 20:00'::timestamp),
  ('Commander party', 'Commander', '2026-08-21 20:00'::timestamp),
  ('Torneo pauper', 'Pauper', '2026-08-25 20:00'::timestamp),
  ('Torneo premodern', 'Premodern', '2026-08-28 20:00'::timestamp),
  ('Casual commander multiplayer', 'Commander', '2026-09-01 20:00'::timestamp),
  ('Commander party', 'Commander', '2026-09-04 20:00'::timestamp),
  ('Torneo lega pauper', 'Pauper', '2026-09-08 20:00'::timestamp),
  ('Torneo modern', 'Modern', '2026-09-11 20:00'::timestamp),
  ('Casual commander multiplayer', 'Commander', '2026-09-15 20:00'::timestamp),
  ('Torneo premodern', 'Premodern', '2026-09-18 20:00'::timestamp),
  ('Torneo lega pauper', 'Pauper', '2026-09-22 20:00'::timestamp),
  ('Prerelease 2HG (Reality Fracture)', '2HG', '2026-09-25 19:30'::timestamp),
  ('Prerelease sing. (Reality Fracture)', 'Sealed', '2026-09-26 14:30'::timestamp),
  ('Prerelease sing.', 'Sealed', '2026-09-29 19:30'::timestamp),
  ('Release draft', 'Draft', '2026-10-06 19:30'::timestamp)
) as t(name, format_name, starts_at_local);
