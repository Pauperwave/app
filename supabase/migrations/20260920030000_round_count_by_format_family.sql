-- Round count per format family, same shape as the round duration (user
-- request, 2026-09-20): 4 rounds for every 1v1 format, the old default (2)
-- for Commander. Replaces the per-format round_count_by_format map.
alter table public.pauperwave_settings
  add column one_vs_one_round_count smallint not null default 4,
  add constraint ck_settings_one_vs_one_round_count
    check (one_vs_one_round_count >= 1);

alter table public.pauperwave_settings
  rename column default_round_count to commander_round_count;
alter table public.pauperwave_settings
  rename constraint ck_settings_default_round_count to ck_settings_commander_round_count;

alter table public.pauperwave_settings
  drop column round_count_by_format;
