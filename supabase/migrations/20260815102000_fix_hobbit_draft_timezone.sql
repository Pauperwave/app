-- The seed migration (20260815100500) cast the draft's date to timestamptz
-- without a timezone, which Postgres interprets in the session's timezone
-- (UTC) rather than Europe/Rome — the tournament showed as starting at
-- 16:00 in the browser (CEST, UTC+2) instead of the intended 14:00 local.

update public.tournaments
set
  starts_at = (starts_at::date + time '14:00') at time zone 'Europe/Rome',
  ends_at = (starts_at::date + time '21:00') at time zone 'Europe/Rome'
where name = 'Draft "Lo Hobbit"';
