-- Allows a self-kill (suicide) to be recorded — the real Telegram bot
-- Commander flow needs it to count toward scoring, same rate as any other
-- kill (user request, 2026-09-24). league, the project this schema was
-- ported from (ADR-042, docs/PROGRESS.md), never had this constraint —
-- round_kills there always allowed killer_id = victim_id, scored identically
-- to any other kill, just flagged "suicidio" in its own UI.
alter table public.tournament_kills
  drop constraint ck_tournament_kills_no_self_kill;
