-- supabase\migrations\20261001110000_add_pairing_no_kills.sql
-- Confirms a Commander table ended without any kill. Without it, "no kills entered" can't be told
-- apart from "kills not entered yet" (zero tournament_kills rows either way), so the round status
-- showed such tables as missing forever (user request, 2026-10-01). Set by the organizer; recording
-- a kill at the table clears it again (recordKill).
alter table public.tournament_pairings
  add column no_kills boolean not null default false;
