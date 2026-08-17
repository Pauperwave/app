-- supabase\migrations\20260816230000_add_leagues_image_url.sql
-- Optional cover image per league (user request, 2026-08-16) — same
-- "just a URL, no upload UI" convention as tournaments.image_url/
-- locations.image_url. Paired with an app-layer cascade (not a DB trigger):
-- setting/changing a league's image_url overwrites image_url on every
-- tournament currently linked to it via tournaments.league_uuid — see the
-- ADR in docs/PROGRESS.md and server/api/leagues/[id]/update.post.ts.
alter table public.leagues
  add column image_url text;
