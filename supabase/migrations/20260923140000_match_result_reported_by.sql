-- Tracks which player (if any) originally reported a 1v1 result via the
-- Telegram bot, confirmed by their opponent — null for a result an
-- organizer entered directly in the app. Lets the UI distinguish "suggested
-- and confirmed by a player" from "entered manually by staff" (user
-- request, 2026-09-23) instead of both looking identical once saved.
alter table public.tournament_match_results
  add column reported_by_player_uuid uuid null references public.players (uuid);
