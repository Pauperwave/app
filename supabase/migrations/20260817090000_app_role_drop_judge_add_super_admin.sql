-- Recreate app_role enum: drop 'judge' (dropped from the app-level role
-- model, decided 2026-08-10, see docs/architecture/roles.md), add
-- 'super_admin' as a new top tier above 'admin'.
-- Preconditions verified 2026-08-17: no user_roles row uses 'judge', and
-- no user has more than one role row (safe to tighten the unique
-- constraint from (user_id, role) to (user_id) in the same migration).
-- Postgres has no ALTER TYPE ... DROP VALUE, so the type is recreated.

ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('player', 'organizer', 'admin', 'super_admin');

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

ALTER TABLE public.user_roles
  DROP CONSTRAINT ck_user_roles_user_id_role_key;

ALTER TABLE public.user_roles
  ADD CONSTRAINT uq_user_roles_user_id UNIQUE (user_id);

-- judge role removed entirely, this function no longer means anything
DROP FUNCTION public.is_judge(uuid);

-- signature-level dependency on the type, needs drop + recreate
DROP FUNCTION public.has_role(uuid, public.app_role_old);

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$function$;

DROP FUNCTION public.get_user_role(uuid);

CREATE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1),
    'player'
  );
$function$;

DROP FUNCTION public.get_user_roles(uuid);

CREATE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS public.app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select array_agg(role)
  from public.user_roles
  where user_id = _user_id
$function$;

-- super_admin is a superset of admin/organizer for management purposes
CREATE OR REPLACE FUNCTION public.has_management_permissions(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'organizer', 'super_admin')
  );
$function$;

-- unchanged: is_admin stays strictly 'admin', not a super_admin superset
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'admin'
  );
$function$;

CREATE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'super_admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_organizer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select public.has_role(_user_id, 'organizer')
$function$;

-- manage-roles is a super_admin-only permission (docs/architecture/roles.md);
-- plain admin no longer manages role assignments via this table
DROP POLICY admin_full_access ON public.user_roles;

CREATE POLICY admin_full_access ON public.user_roles
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP TYPE public.app_role_old;
