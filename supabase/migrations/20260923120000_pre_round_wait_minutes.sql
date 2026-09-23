-- Parametrizes the round timer's "pre" phase (SISTEMATEVI countdown before
-- GIOCO starts), previously hardcoded as PRE_TIMER_MINUTES = 3 in
-- useRoundTimerEngine.ts (user request, 2026-09-23). Same singleton-row
-- convention as the other tournament settings.
alter table public.pauperwave_settings
  add column pre_round_wait_minutes smallint not null default 3,
  add constraint ck_settings_pre_round_wait_minutes
    check (pre_round_wait_minutes >= 0 and pre_round_wait_minutes <= 30);
