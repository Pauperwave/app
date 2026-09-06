-- supabase\migrations\20260906091500_normalize_tournament_match_results_fk_naming.sql
-- The FKs on tournament_match_results (previous migration) weren't named
-- explicitly, so Postgres defaulted to <table>_<col>_fkey instead of this
-- project's fk_<table>_<col>_fkey convention (established in
-- normalize_constraint_naming.sql). Renaming, not recreating — same
-- behavior, cosmetic only.
alter table public.tournament_match_results
  rename constraint tournament_match_results_pairing_uuid_fkey
  to fk_tournament_match_results_pairing_uuid_fkey;

alter table public.tournament_match_results
  rename constraint tournament_match_results_player1_uuid_fkey
  to fk_tournament_match_results_player1_uuid_fkey;

alter table public.tournament_match_results
  rename constraint tournament_match_results_player2_uuid_fkey
  to fk_tournament_match_results_player2_uuid_fkey;

alter table public.tournament_match_results
  rename constraint tournament_match_results_tournament_uuid_fkey
  to fk_tournament_match_results_tournament_uuid_fkey;
