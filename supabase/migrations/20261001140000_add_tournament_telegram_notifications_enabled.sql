-- supabase\migrations\20261001140000_add_tournament_telegram_notifications_enabled.sql
-- Per-tournament switch for the passive Telegram notifications (registration accepted, tables
-- announced/cancelled, reset). On by default; the organizer can turn it off from the tournament
-- page (user request, 2026-10-01). Commands the player sends themselves (/tavolo) are unaffected.
alter table public.tournaments
  add column telegram_notifications_enabled boolean not null default true;
