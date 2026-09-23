-- Redesign: a 1v1 result reported via Telegram is now written straight to
-- tournament_match_results (same as an organizer's own entry) instead of
-- waiting in a separate "pending report" table for the opponent's
-- confirmation to become real (user request, 2026-09-24). The opponent still
-- gets a confirm/dispute prompt, but it no longer gates whether the score
-- counts — a dispute flags an already-saved result for organizer review
-- instead of reverting it.
--
-- tournament_match_result_reports had exactly one real pending row at
-- migration time (pairing 319ab809-275f-4cf1-8d5b-7a373ebff3b3, reported
-- 2026-09-23, never answered) — deliberately left behind per user decision,
-- not migrated forward; that table now goes to a completed-less pairing,
-- to be re-entered manually or re-reported via Telegram under the new flow.
drop table public.tournament_match_result_reports;

alter table public.tournament_match_results
  add column confirmed_at timestamptz null,
  add column disputed_at timestamptz null;

comment on column public.tournament_match_results.confirmed_at is
  'When the opponent confirmed a Telegram-reported score via the bot''s prompt. Null for an organizer-entered result or one not yet answered.';
comment on column public.tournament_match_results.disputed_at is
  'When the opponent disputed a Telegram-reported score via the bot''s prompt. The score stays the saved result (not reverted) — an organizer reviews and corrects it manually.';
