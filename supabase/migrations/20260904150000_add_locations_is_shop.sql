-- Distinguishes a game shop (Fantàsia, La Fenice, Magman, Timetwister Games)
-- from a club/community venue (user request, 2026-09-04) — drives a badge on
-- /locations (LocationsListCard.vue, useLocationsTableColumns.ts,
-- PresentationCard.vue). Read-only display for now, no AddModal/EditModal
-- toggle yet (same as temporarily_closed, which also has none).

alter table public.locations
  add column is_shop boolean not null default false;

update public.locations
  set is_shop = true
  where name in ('Fantàsia', 'La Fenice', 'Magman', 'Timetwister Games');
