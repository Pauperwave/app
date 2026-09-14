-- Follow-up to 20260914000000_baseline_commander_tournament_schema.sql
-- (user request, 2026-09-14, while planning the Commander tournament port
-- from `league`):
--
-- 1. tournament_pairings had no uniqueness guard on (round_uuid,
--    table_number) — nothing stopped two pairings in the same round from
--    getting the same table number.
-- 2. player_avoid_pairs: a global, cross-tournament hard constraint
--    ("these two players must never be seated together"), ported from
--    `league`'s own table of the same shape/intent — canonical
--    (player_a_uuid, player_b_uuid) ordering enforced by a check
--    constraint, not left to callers to dedupe (a, b) vs (b, a).
-- 3. UPDATE policies for tournament_round_results/tournament_kills/
--    tournament_votes's own-row player-facing policies were INSERT-only —
--    a player could log a result/kill/vote but never correct it
--    themselves. The upcoming Telegram bot self-service flow needs both
--    (user confirmed, 2026-09-14: self-service write access is
--    intentional, not an oversight — the bot both inserts and corrects on
--    the player's behalf).

alter table public.tournament_pairings
  add constraint uq_tournament_pairings_round_table unique (round_uuid, table_number);

-- === player_avoid_pairs =====================================================
create table if not exists public.player_avoid_pairs (
  player_a_uuid uuid not null references public.players (uuid) on delete cascade,
  player_b_uuid uuid not null references public.players (uuid) on delete cascade,
  created_at timestamptz not null default now(),
  constraint pk_player_avoid_pairs primary key (player_a_uuid, player_b_uuid),
  -- Canonical ordering (a < b) so (x, y) and (y, x) can't both be inserted
  -- as if they were distinct rows.
  constraint ck_player_avoid_pairs_canonical_order check (player_a_uuid < player_b_uuid)
);

alter table public.player_avoid_pairs enable row level security;

drop policy if exists "public_read" on public.player_avoid_pairs;
create policy "public_read" on public.player_avoid_pairs
  for select to public using (true);

drop policy if exists "management_full_access" on public.player_avoid_pairs;
create policy "management_full_access" on public.player_avoid_pairs
  for all to public
  using (has_management_permissions(auth.uid()))
  with check (has_management_permissions(auth.uid()));

-- === self-service UPDATE policies ==========================================
drop policy if exists "player_update_own_result" on public.tournament_round_results;
create policy "player_update_own_result" on public.tournament_round_results
  for update to public
  using (
    player_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
    and exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_round_results.pairing_uuid
        and (
          p.player1_uuid = tournament_round_results.player_uuid
          or p.player2_uuid = tournament_round_results.player_uuid
          or p.player3_uuid = tournament_round_results.player_uuid
          or p.player4_uuid = tournament_round_results.player_uuid
        )
    )
  )
  with check (
    player_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
    and exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_round_results.pairing_uuid
        and (
          p.player1_uuid = tournament_round_results.player_uuid
          or p.player2_uuid = tournament_round_results.player_uuid
          or p.player3_uuid = tournament_round_results.player_uuid
          or p.player4_uuid = tournament_round_results.player_uuid
        )
    )
  );

drop policy if exists "player_update_kill_in_own_pairing" on public.tournament_kills;
create policy "player_update_kill_in_own_pairing" on public.tournament_kills
  for update to public
  using (
    exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_kills.pairing_uuid
        and (
          p.player1_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player2_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player3_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player4_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_kills.pairing_uuid
        and (
          p.player1_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player2_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player3_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player4_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
        )
    )
  );

drop policy if exists "player_update_vote_in_own_pairing" on public.tournament_votes;
create policy "player_update_vote_in_own_pairing" on public.tournament_votes
  for update to public
  using (
    exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_votes.pairing_uuid
        and (
          p.player1_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player2_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player3_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player4_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
        )
        and (
          tournament_votes.voted_player_uuid = p.player1_uuid
          or tournament_votes.voted_player_uuid = p.player2_uuid
          or tournament_votes.voted_player_uuid = p.player3_uuid
          or tournament_votes.voted_player_uuid = p.player4_uuid
        )
        and tournament_votes.voted_player_uuid <> (select players.uuid from public.players where players.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tournament_pairings p
      where p.uuid = tournament_votes.pairing_uuid
        and (
          p.player1_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player2_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player3_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
          or p.player4_uuid = (select players.uuid from public.players where players.user_id = auth.uid())
        )
        and (
          tournament_votes.voted_player_uuid = p.player1_uuid
          or tournament_votes.voted_player_uuid = p.player2_uuid
          or tournament_votes.voted_player_uuid = p.player3_uuid
          or tournament_votes.voted_player_uuid = p.player4_uuid
        )
        and tournament_votes.voted_player_uuid <> (select players.uuid from public.players where players.user_id = auth.uid())
    )
  );
