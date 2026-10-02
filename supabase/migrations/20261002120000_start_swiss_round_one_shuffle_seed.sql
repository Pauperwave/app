-- supabase\migrations\20261002120000_start_swiss_round_one_shuffle_seed.sql
-- Same reproducible round-1 seed as Commander (20261002110000) for 1v1 tournaments (user request, 2026-10-02):
-- start_swiss_round_one stores the confirmed shuffle seed on round 1, so the preview can reopen on it.
drop function public.start_swiss_round_one(uuid, uuid[]);

create function public.start_swiss_round_one(
  p_tournament_uuid uuid,
  p_associate_order uuid[],
  p_shuffle_seed int default null
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

  insert into tournament_rounds (tournament_uuid, round_number, status, started_at, shuffle_seed)
  values (p_tournament_uuid, 1, 'in_progress', now(), p_shuffle_seed)
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
