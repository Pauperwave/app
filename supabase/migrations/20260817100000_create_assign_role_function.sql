-- assign_role(uuid, app_role): the missing mechanism from
-- docs/architecture/roles.md's bootstrap-table note, "Suggested order of
-- work" step 3. Backs the (currently decorative) role dropdown in
-- app/components/settings/MembersList.vue.
--
-- Restricted to super_admin (not admin) per the manage-roles permission
-- (docs/architecture/roles.md §1's PERMISSION_LEVEL table) and consistent
-- with user_roles' own admin_full_access RLS policy, repointed to
-- is_super_admin in the 2026-08-17 app_role migration.
--
-- user_roles now has UNIQUE(user_id) (one role per user), so this is an
-- upsert, not a plain insert. Assigning 'player' deletes the row instead
-- of inserting one, matching the existing convention that 'player' is the
-- COALESCE default in get_user_role and never gets a stored row.

CREATE FUNCTION public.assign_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
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
