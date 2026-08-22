-- supabase\migrations\20260822100000_drop_overly_permissive_associates_policy.sql
-- "Only auth users can do things" (FOR ALL, role authenticated, USING (true),
-- no WITH CHECK) granted any logged-in user full SELECT/INSERT/UPDATE/DELETE
-- on every associate row — tax codes, birth dates, home addresses — and
-- overrode the narrower player_own_associate/management_full_access policies,
-- since Postgres RLS policies are OR'd together. Found 2026-08-05, tracked as
-- issue #3. The other three policies on this table (management_full_access,
-- player_own_associate, public_apply) already cover every legitimate access
-- path, so nothing else needs to change alongside this drop.
drop policy "Only auth users can do things" on public.pauperwave_associates;
