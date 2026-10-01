-- supabase\migrations\20261001130000_add_tournament_is_pinned.sql
-- Lets the organizer pin a tournament so /tournaments shows it in its own "In evidenza" section
-- above every status section (user request, 2026-10-01). Independent of status, several can be pinned.
alter table public.tournaments
  add column is_pinned boolean not null default false;
