-- Swiss scoring is fixed by the official Magic Tournament Rules (3 points per
-- win, 1 per draw, 0 per loss; a 0.33 floor on the tiebreak percentages), so
-- it is not a setting — dropping the columns added by the previous migration.
alter table public.pauperwave_settings
  drop constraint ck_settings_swiss_points,
  drop constraint ck_settings_swiss_tiebreak_floor,
  drop column swiss_win_points,
  drop column swiss_draw_points,
  drop column swiss_tiebreak_floor_percent;
