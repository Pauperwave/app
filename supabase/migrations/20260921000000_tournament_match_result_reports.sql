-- A 1v1 result reported by one player through the Telegram bot, waiting for
-- the opponent to confirm it. tournament_match_results stays the official
-- result (and marks the pairing completed) — a report only becomes one when
-- the opponent confirms it or an organizer enters/confirms the score.
--
-- One report per pairing. The row is deleted once the real result is saved
-- (opponent confirms, or an organizer sets the result), so it only ever
-- holds what still needs an answer: 'pending' (nobody answered yet) or
-- 'disputed' (the opponent says it's wrong). Either way an organizer decides.
--
-- Written only by the bot (service role), read by organizers to flag the
-- table — no client insert/update/delete policy on purpose.
create table public.tournament_match_result_reports (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  tournament_uuid uuid not null references public.tournaments (uuid) on delete cascade,
  pairing_uuid uuid not null unique references public.tournament_pairings (uuid) on delete cascade,
  reporter_uuid uuid not null references public.players (uuid),
  player1_games_won smallint not null,
  player2_games_won smallint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_tournament_match_result_reports_score check (
    (player1_games_won, player2_games_won) in ((2, 0), (2, 1), (1, 1), (1, 2), (0, 2))
  ),
  constraint ck_tournament_match_result_reports_status check (
    status in ('pending', 'disputed')
  )
);

create index idx_tournament_match_result_reports_tournament_uuid
  on public.tournament_match_result_reports (tournament_uuid);

alter table public.tournament_match_result_reports enable row level security;

create policy "Management can read tournament match result reports"
  on public.tournament_match_result_reports
  for select
  to authenticated
  using (has_management_permissions((select auth.uid())));

create trigger set_tournament_match_result_reports_updated_at
  before update on public.tournament_match_result_reports
  for each row
  execute function public.set_updated_at();
