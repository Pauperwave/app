-- server\utils\telegram bot's future /vota flow (and any 1v1 standings
-- work) needs a place to store best-of-3 match scores for Swiss-style
-- formats (Pauper, Premodern, Modern, ...). tournament_round_results is
-- Commander-only (position/commander_deck_uuid, one row per player per
-- pairing) — it can't represent a 1v1 game score, and overloading it would
-- make every reader guess which shape applies to a given row.
--
-- One row per pairing, not per player: player1/player2_games_won are
-- stored as two smallints rather than a single "2-1" text field, so
-- win/loss and tiebreakers (Game Win %) can be computed by comparison
-- instead of parsing a string. Win/loss/draw is deliberately NOT a stored
-- column — it's always derivable from the two counts, and a stored copy
-- could drift out of sync with them.
--
-- The check constraint only allows the 5 valid best-of-3 outcomes. (0,0)
-- is deliberately excluded — a double no-show/bye isn't a "played" match
-- and belongs to the bye mechanism this app doesn't implement yet
-- (user decision, 2026-09-06).
create table public.tournament_match_results (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  tournament_uuid uuid not null references public.tournaments (uuid) on delete cascade,
  pairing_uuid uuid not null unique references public.tournament_pairings (uuid) on delete cascade,
  player1_uuid uuid not null references public.players (uuid),
  player2_uuid uuid not null references public.players (uuid),
  player1_games_won smallint not null,
  player2_games_won smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_tournament_match_results_score check (
    (player1_games_won, player2_games_won) in ((2, 0), (2, 1), (1, 1), (1, 2), (0, 2))
  )
);

create index idx_tournament_match_results_tournament_uuid
  on public.tournament_match_results (tournament_uuid);

alter table public.tournament_match_results enable row level security;

-- Same public-read shape as tournament_round_results (read via the anon
-- client in useCommanderMatchHistoryQuery.ts) — match results are
-- public competition info, not gated data.
create policy "Authenticated users can read tournament match results"
  on public.tournament_match_results
  for select
  to authenticated
  using (true);

-- "only an organizer or above can put results in" (user request, 2026-09-06)
-- — has_management_permissions() covers organizer/admin/super_admin.
create policy "Management can insert tournament match results"
  on public.tournament_match_results
  for insert
  to authenticated
  with check (has_management_permissions((select auth.uid())));

create policy "Management can update tournament match results"
  on public.tournament_match_results
  for update
  to authenticated
  using (has_management_permissions((select auth.uid())))
  with check (has_management_permissions((select auth.uid())));

create policy "Management can delete tournament match results"
  on public.tournament_match_results
  for delete
  to authenticated
  using (has_management_permissions((select auth.uid())));

create trigger set_tournament_match_results_updated_at
  before update on public.tournament_match_results
  for each row
  execute function public.set_updated_at();
