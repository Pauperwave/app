-- supabase\migrations\20261003140000_tournament_round_timers_realtime.sql
-- The turns Mini App follows the event timer live: it has no Supabase login (Telegram's signed
-- initData identifies the player), so the Realtime subscription runs as anon and needs a public
-- SELECT policy. The table holds only the phase, instants and lengths of a round timer, no
-- personal data; writes stay staff-only (management_full_access).
create policy public_read on public.tournament_round_timers
  for select
  using (true);

alter publication supabase_realtime add table public.tournament_round_timers;
