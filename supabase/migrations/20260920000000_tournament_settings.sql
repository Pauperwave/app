-- Tournament values that were hardcoded in the tournament logic, now editable
-- in /settings (user request, 2026-09-20): round duration per format family,
-- Swiss scoring (win/draw points, tiebreak floor) and the round-count rules
-- (per-format default, Swiss rounds by player count). Same singleton-row
-- convention as the membership fee / trash retention columns; the two round-count
-- tables are jsonb because they are small ordered lists edited as a whole.
alter table public.pauperwave_settings
  add column commander_round_minutes smallint not null default 75,
  add column one_vs_one_round_minutes smallint not null default 50,
  add column swiss_win_points smallint not null default 3,
  add column swiss_draw_points smallint not null default 1,
  add column swiss_tiebreak_floor_percent numeric(5, 2) not null default 33.33,
  add column default_round_count smallint not null default 2,
  add column round_count_by_format jsonb not null
    default '{"Draft": 4, "Pauper": 4, "Premodern": 4}'::jsonb,
  add column swiss_round_count_tiers jsonb not null
    default '[{"maxPlayers": 8, "rounds": 3}, {"maxPlayers": 16, "rounds": 4}, {"maxPlayers": 32, "rounds": 5}, {"maxPlayers": 64, "rounds": 6}, {"maxPlayers": 128, "rounds": 7}, {"maxPlayers": 226, "rounds": 8}, {"maxPlayers": 409, "rounds": 9}]'::jsonb,
  add column swiss_round_count_beyond smallint not null default 10,
  add constraint ck_settings_commander_round_minutes
    check (commander_round_minutes between 10 and 120),
  add constraint ck_settings_one_vs_one_round_minutes
    check (one_vs_one_round_minutes between 10 and 120),
  add constraint ck_settings_swiss_points
    check (swiss_draw_points >= 0 and swiss_win_points > swiss_draw_points),
  add constraint ck_settings_swiss_tiebreak_floor
    check (swiss_tiebreak_floor_percent between 0 and 100),
  add constraint ck_settings_default_round_count
    check (default_round_count >= 1),
  add constraint ck_settings_swiss_round_count_beyond
    check (swiss_round_count_beyond >= 1);
