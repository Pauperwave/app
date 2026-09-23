-- Adds tournament_match_results and tournament_match_result_reports to the
-- supabase_realtime publication (user request, 2026-09-23): organizers/
-- admins watching a 1v1 round need to see a Telegram-submitted result — and
-- whether the opponent confirmed it — without refreshing the page (see
-- app/composables/tournaments/rounds/useTournamentMatchResultsRealtime.ts).
-- Existing RLS SELECT policies on both tables already gate what an
-- authenticated client actually receives over the replication stream.
alter publication supabase_realtime add table public.tournament_match_results;
alter publication supabase_realtime add table public.tournament_match_result_reports;
