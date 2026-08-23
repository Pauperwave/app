-- supabase\migrations\20260823140000_role_locked_flag_instead_of_hardcoded_uuid.sql
-- Replaces the hardcoded protected-uuid check added in migration
-- 20260823130000 with a data-driven flag (user request, 2026-08-23): a
-- literal uuid baked into assign_role's function body is fragile (silently
-- stops protecting anyone if that auth.users row is ever deleted/recreated),
-- opaque (who's protected is only readable by opening the migration source),
-- and rigid (protecting a second account means another migration, not an
-- UPDATE). Same "hardcoded constant -> DB-backed data" move already applied
-- elsewhere in this app (ADR-020, the membership fee).
ALTER TABLE public.user_roles
  ADD COLUMN role_locked boolean NOT NULL DEFAULT false;

-- One-time data migration, not function logic: flips the flag for the
-- app's developer/owner (emanuelenardi.magic@gmail.com), the same account
-- 20260823130000 hardcoded by uuid (resolved then via
-- supabase.auth.admin.listUsers(), not guessed). Protecting a different or
-- additional account later is just another UPDATE, no migration needed.
UPDATE public.user_roles
  SET role_locked = true
  WHERE user_id = 'c8fcd6a4-5c16-4a38-8511-8e43d1fc4c2c';

-- Same admin-can-assign-but-never-touch-super_admin rules as
-- 20260823130000, minus the hardcoded uuid: role_locked is checked instead,
-- and unconditionally (no caller, not even super_admin, can change a
-- locked row's role or delete it via the 'player' branch below).
CREATE OR REPLACE FUNCTION public.assign_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_current_role public.app_role;
  target_locked boolean;
BEGIN
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT role, role_locked INTO target_current_role, target_locked
    FROM public.user_roles WHERE user_id = p_user_id;

  IF target_locked THEN
    RAISE EXCEPTION 'This user''s role cannot be changed';
  END IF;

  IF NOT public.is_super_admin(auth.uid()) THEN
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
