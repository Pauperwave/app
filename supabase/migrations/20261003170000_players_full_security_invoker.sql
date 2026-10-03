-- Closes the leak players_public (20261003160000) makes room for: players_full exposed every
-- player's email and associate number to anyone with the anon key, because the view ran as its
-- owner and skipped the associates' RLS. As security_invoker it follows the caller's own access:
-- staff (has_management_permissions) read every row, a player only their own, and anon nothing.
--
-- Apply only once the app reads names from players_public: until then a player's player list would
-- shrink to their own row.
alter view public.players_full set (security_invoker = true);

revoke all on public.players_full from anon, authenticated;
grant select on public.players_full to authenticated;
