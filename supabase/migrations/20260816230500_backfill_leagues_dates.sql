-- supabase\migrations\20260816230500_backfill_leagues_dates.sql
-- One-time backfill following the previous migration (add_leagues_image_url
-- also carried the "dates are derived" ADR, docs/PROGRESS.md ADR-019) —
-- existing leagues.starts_at/ends_at were set by hand before this session's
-- change, so they need recomputing once against their actual tournaments
-- rather than waiting for the next tournament write to touch each one.
-- Same min(starts_at)/max(ends_at) over non-deleted tournaments that
-- server/utils/leagueDates.ts computes going forward.
with league_dates as (
  select
    league_uuid,
    min(starts_at) as starts_at,
    max(ends_at) as ends_at
  from public.tournaments
  where league_uuid is not null
    and deleted_at is null
  group by league_uuid
)
update public.leagues
set
  starts_at = league_dates.starts_at,
  ends_at = league_dates.ends_at
from league_dates
where leagues.uuid = league_dates.league_uuid;

-- Leagues with zero linked tournaments have nothing to derive from — null
-- out both, matching a brand new league (useLeaguesQuery.ts already falls
-- back to created_at when starts_at is null).
update public.leagues
set starts_at = null, ends_at = null
where uuid not in (select league_uuid from public.tournaments where league_uuid is not null and deleted_at is null);
