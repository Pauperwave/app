-- Drop leagues.season: never used for anything beyond a free-text display
-- column, and the UI dropped it (user request, 2026-08-16) — a league is
-- already scoped by its own name/dates, "season" was redundant with that.
alter table public.leagues drop column if exists season;
