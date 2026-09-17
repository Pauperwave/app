-- Per-tournament round duration (user request, 2026-09-16, league it.json
-- audit: RoundTimer.vue had a hardcoded 75-minute default with no real
-- source — league's own tournament create/edit form has a "durata round"
-- field, backed by tournament_round_duration, default 75, 10-120 range).
alter table public.tournaments
  add column round_duration_minutes integer not null default 75
    constraint ck_tournaments_round_duration_minutes_range
    check (round_duration_minutes >= 10 and round_duration_minutes <= 120);
