-- Player drops and byes for 1v1 Swiss tournaments (user request, 2026-09-20).
--
-- Drops: one row per dropped player, recording the round they dropped in and
-- when. A dropped player is not paired from the next round on, but stays in the
-- standings. round_uuid cascades, so turning a round back also undoes the drops
-- made during it.
--
-- Byes: with an odd number of players, the last player of the ordered list
-- handed to the round RPCs (the last-ranked active player, computed by the
-- client) sits out. A bye is a pairing with a single player (player2_uuid null,
-- table_number null) that is already 'completed'; it scores as a match win and
-- has no tournament_match_results row.
create table public.tournament_player_drops (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  tournament_uuid uuid not null references public.tournaments (uuid) on delete cascade,
  player_uuid uuid not null references public.players (uuid),
  round_uuid uuid not null references public.tournament_rounds (uuid) on delete cascade,
  dropped_at timestamptz not null default now(),
  constraint uq_tournament_player_drops_player unique (tournament_uuid, player_uuid)
);

create index idx_tournament_player_drops_tournament_uuid
  on public.tournament_player_drops (tournament_uuid);

alter table public.tournament_player_drops enable row level security;

create policy "Authenticated users can read tournament player drops"
  on public.tournament_player_drops
  for select
  to authenticated
  using (true);

create policy "Management can insert tournament player drops"
  on public.tournament_player_drops
  for insert
  to authenticated
  with check (has_management_permissions((select auth.uid())));

create policy "Management can delete tournament player drops"
  on public.tournament_player_drops
  for delete
  to authenticated
  using (has_management_permissions((select auth.uid())));

-- A pairing with a single player is a bye.
alter table public.tournament_pairings
  drop constraint ck_tournament_pairings_player_count;

alter table public.tournament_pairings
  add constraint ck_tournament_pairings_player_count
  check (
    (player1_uuid is not null and player2_uuid is null and player3_uuid is null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is null)
    or
    (player1_uuid is not null and player2_uuid is not null and player3_uuid is not null and player4_uuid is not null)
  );

create or replace function public.start_swiss_round_one(
  p_tournament_uuid uuid,
  p_associate_order uuid[]
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_count int := coalesce(array_length(p_associate_order, 1), 0);
  v_player_uuids uuid[];
  v_round_uuid uuid;
  v_table_number int := 1;
  v_paired_count int;
begin
  if v_count < 2 then
    raise exception 'Invalid player count for 1v1 pairing: %', v_count;
  end if;

  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, 1, 'in_progress', now())
  returning uuid into v_round_uuid;

  v_paired_count := v_count - v_count % 2;

  for i in 1..v_paired_count by 2 loop
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_round_uuid, p_tournament_uuid, v_table_number, v_player_uuids[i], v_player_uuids[i + 1], 'playing'
    );
    v_table_number := v_table_number + 1;
  end loop;

  -- Odd count: the last player of the order gets the bye.
  if v_count % 2 = 1 then
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_round_uuid, p_tournament_uuid, null, v_player_uuids[v_count], null, 'completed'
    );
  end if;

  update tournaments
  set status = 'in_progress'
  where uuid = p_tournament_uuid;

  return v_round_uuid;
end;
$function$;

create or replace function public.advance_swiss_round(
  p_tournament_uuid uuid,
  p_current_round_number smallint,
  p_associate_order uuid[] default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  v_current_round_uuid uuid;
  v_round_count smallint;
  v_new_round_number smallint;
  v_new_round_uuid uuid;
  v_count int;
  v_player_uuids uuid[];
  v_table_number int := 1;
  v_paired_count int;
begin
  select uuid into v_current_round_uuid
  from tournament_rounds
  where tournament_uuid = p_tournament_uuid
    and round_number = p_current_round_number
    and status = 'in_progress';

  if v_current_round_uuid is null then
    raise exception 'Round % is not the tournament''s current in_progress round', p_current_round_number;
  end if;

  update tournament_rounds
  set status = 'completed', ended_at = now()
  where uuid = v_current_round_uuid;

  select round_count into v_round_count from tournaments where uuid = p_tournament_uuid;
  v_new_round_number := p_current_round_number + 1;

  if v_new_round_number > coalesce(v_round_count, 0) then
    update tournaments set status = 'completed' where uuid = p_tournament_uuid;
    return null;
  end if;

  v_count := coalesce(array_length(p_associate_order, 1), 0);
  if v_count = 0 then
    raise exception 'associate order is required to create round %', v_new_round_number;
  end if;
  if v_count < 2 then
    raise exception 'Invalid player count for 1v1 pairing: %', v_count;
  end if;

  select array_agg(p.uuid order by oa.ord)
  into v_player_uuids
  from unnest(p_associate_order) with ordinality as oa (assoc_uuid, ord)
  join players p on p.associate_uuid = oa.assoc_uuid
  join tournament_registrations tr
    on tr.player_uuid = p.uuid and tr.tournament_uuid = p_tournament_uuid;

  if coalesce(array_length(v_player_uuids, 1), 0) <> v_count then
    raise exception 'Could not resolve every associate to a registered player of this tournament';
  end if;

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at)
  values (p_tournament_uuid, v_new_round_number, 'in_progress', now())
  returning uuid into v_new_round_uuid;

  v_paired_count := v_count - v_count % 2;

  for i in 1..v_paired_count by 2 loop
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_new_round_uuid, p_tournament_uuid, v_table_number, v_player_uuids[i], v_player_uuids[i + 1], 'playing'
    );
    v_table_number := v_table_number + 1;
  end loop;

  -- Odd count: the last player of the order (the last-ranked active player,
  -- as ordered by the client) gets the bye.
  if v_count % 2 = 1 then
    insert into tournament_pairings (
      round_uuid, tournament_uuid, table_number, player1_uuid, player2_uuid, status
    ) values (
      v_new_round_uuid, p_tournament_uuid, null, v_player_uuids[v_count], null, 'completed'
    );
  end if;

  return v_new_round_uuid;
end;
$function$;
