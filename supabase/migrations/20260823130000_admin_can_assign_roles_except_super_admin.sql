-- supabase\migrations\20260823130000_admin_can_assign_roles_except_super_admin.sql
-- User request (2026-08-23): both admin and super_admin should be able to
-- assign roles, but admin must never be able to touch the super_admin tier
-- — granting it to someone, or editing/demoting someone who already has
-- it. A "just block self-promotion" rule was considered and rejected: an
-- admin could still promote a second account to admin, then use that
-- second account to promote the first to super_admin, so the boundary has
-- to be "admin can't touch super_admin at all," not "admin can't touch
-- their own role."
--
-- On top of that: nobody — not even another super_admin — may change the
-- role of this specific account, hardcoded by uuid (looked up via
-- supabase.auth.admin.listUsers() filtered by email, not guessed): the app's
-- developer/owner (Emanuele Nardi, docs/architecture/roles.md's role table).
-- A protected row, not a protected role tier — the point is this one person
-- can never be locked out or reassigned by anyone else, not that
-- 'super_admin' in general is off-limits (super_admin can still assign
-- super_admin to other accounts).
CREATE OR REPLACE FUNCTION public.assign_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- emanuelenardi.magic@gmail.com's auth.users.id — hardcoded rather than
  -- resolved by email at call time, so this check can't be defeated by a
  -- future email change and doesn't need a lookup against auth.users (not
  -- reachable from a SECURITY DEFINER function the way public.* is).
  protected_user_id CONSTANT uuid := 'c8fcd6a4-5c16-4a38-8511-8e43d1fc4c2c';
  target_current_role public.app_role;
BEGIN
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_user_id = protected_user_id THEN
    RAISE EXCEPTION 'This user''s role cannot be changed';
  END IF;

  IF NOT public.is_super_admin(auth.uid()) THEN
    SELECT role INTO target_current_role FROM public.user_roles WHERE user_id = p_user_id;

    IF p_role = 'super_admin' OR target_current_role = 'super_admin' THEN
      RAISE EXCEPTION 'Only a super_admin can grant or modify the super_admin role';
    END IF;
  END IF;

  IF p_role = 'player' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
END;
$$;
