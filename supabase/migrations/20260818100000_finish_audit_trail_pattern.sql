-- Finishes the audit trail pattern docs/supabase/2-database.md always
-- claimed existed: pauperwave_associates has created_by/updated_by columns
-- but no FK ever enforced them, and user_roles never had the columns at
-- all (so assign_role, added 2026-08-17, never recorded who assigned a
-- role). Verified beforehand: pauperwave_associates has 0 non-null
-- created_by and both existing updated_by values are valid associate
-- uuids, so the FK addition is safe; every user_roles row already has a
-- matching players row for the caller-resolution join added below.
--
-- FK target is pauperwave_associates(uuid), not auth.users(id) — same
-- reasoning as pauperwave_payments/pauperwave_wanted_cards (see
-- server/utils/auditColumns.ts): resolving "who" via auth.users would need
-- the Supabase admin API, going through pauperwave_associates is a direct
-- join instead.

ALTER TABLE public.pauperwave_associates
  ADD CONSTRAINT fk_pauperwave_associates_created_by
  FOREIGN KEY (created_by) REFERENCES public.pauperwave_associates (uuid)
  ON DELETE SET NULL;

ALTER TABLE public.pauperwave_associates
  ADD CONSTRAINT fk_pauperwave_associates_updated_by
  FOREIGN KEY (updated_by) REFERENCES public.pauperwave_associates (uuid)
  ON DELETE SET NULL;

ALTER TABLE public.user_roles
  ADD COLUMN created_by uuid null,
  ADD COLUMN updated_by uuid null;

ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_created_by
  FOREIGN KEY (created_by) REFERENCES public.pauperwave_associates (uuid)
  ON DELETE SET NULL;

ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_updated_by
  FOREIGN KEY (updated_by) REFERENCES public.pauperwave_associates (uuid)
  ON DELETE SET NULL;

-- assign_role now resolves the calling super_admin's own associate uuid
-- (via players.user_id = auth.uid(), same join player_own_associate's RLS
-- policy already uses) and records it as created_by on first assignment,
-- updated_by on every assignment/reassignment.
CREATE OR REPLACE FUNCTION public.assign_role(p_user_id uuid, p_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_associate_uuid uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT associate_uuid INTO caller_associate_uuid
  FROM public.players
  WHERE user_id = auth.uid();

  IF p_role = 'player' THEN
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role, created_by, updated_by)
    VALUES (p_user_id, p_role, caller_associate_uuid, caller_associate_uuid)
    ON CONFLICT (user_id) DO UPDATE
      SET role = EXCLUDED.role,
          updated_by = caller_associate_uuid;
  END IF;
END;
$$;
