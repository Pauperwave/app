-- Adds a status for tournaments Pauperwave doesn't run itself but tracks for
-- schedule comparison (user request, 2026-09-04 — Magman, a shop organizer).
-- Deliberately flat/single-valued: none of the usual registration_open ->
-- in_progress -> completed lifecycle applies to a reference-only external
-- calendar, so 'external' covers every Magman row regardless of date.
-- Not added to TOURNAMENT_STATUSES (app/utils/status/tournamentStatus.ts) —
-- never a pickable option in the AddModal/bulk-actions status menu for
-- Pauperwave's own tournaments.

alter table public.tournaments
  drop constraint ck_tournaments_status;

alter table public.tournaments
  add constraint ck_tournaments_status
  check (status = any (array['draft', 'registration_open', 'in_progress', 'completed', 'cancelled', 'external']));
