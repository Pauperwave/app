-- supabase\migrations\20260902105738_payment_renewal_transactional_rpcs.sql
-- create.post.ts/[id]/update.post.ts/[id]/delete.post.ts each write
-- pauperwave_payments, then separately touch pauperwave_associate_renewals
-- (ensureRenewalForPayment/removeStaleRenewal, associateRenewals.ts) as two
-- non-transactional Supabase JS calls — a failure between them leaves the
-- payment recorded but the renewal not reflecting it (docs/architecture/
-- telegram-notifications.md, 2026-09-02). Same fix as register_tournament_players
-- (migration 20260825110000): move the pair into one Postgres function so
-- a single RPC call is one implicit transaction.
--
-- Internal helpers mirroring server/utils/associateRenewals.ts's
-- ensureRenewalForPayment/removeStaleRenewal — used by the three RPCs below.
create function public.ensure_payment_renewal(
  p_associate_uuid uuid,
  p_payment_date timestamptz
)
returns boolean
language plpgsql
set search_path to 'public'
as $function$
declare
  v_year int := extract(year from p_payment_date)::int;
  v_row_count int;
begin
  insert into pauperwave_associate_renewals (associate_uuid, renewal_year)
  values (p_associate_uuid, v_year)
  on conflict (associate_uuid, renewal_year) do nothing;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$function$;

create function public.remove_stale_payment_renewal(
  p_associate_uuid uuid,
  p_payment_date timestamptz,
  p_exclude_payment_id bigint default null
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_year int := extract(year from p_payment_date)::int;
  v_year_start timestamptz := (v_year || '-01-01T00:00:00Z')::timestamptz;
  v_year_end timestamptz := ((v_year + 1) || '-01-01T00:00:00Z')::timestamptz;
  v_remaining int;
begin
  select count(*) into v_remaining
  from pauperwave_payments
  where associate_uuid = p_associate_uuid
    and payment_type = 'Association Fee'
    and payment_date >= v_year_start
    and payment_date < v_year_end
    and deleted_at is null
    and (p_exclude_payment_id is null or id <> p_exclude_payment_id);

  if v_remaining = 0 then
    delete from pauperwave_associate_renewals
    where associate_uuid = p_associate_uuid and renewal_year = v_year;
  end if;
end;
$function$;

create function public.create_payment_with_renewal(
  p_associate_uuid uuid,
  p_payer_name text,
  p_payer_surname text,
  p_payer_email text,
  p_payer_tax_code text,
  p_payment_date timestamptz,
  p_payment_amount numeric,
  p_payment_method text,
  p_payment_type text,
  p_received_by text,
  p_tournament_uuid uuid,
  p_event_uuid uuid,
  p_event_name text,
  p_notes text,
  p_created_by uuid
)
returns table (
  created_payment_id bigint,
  created_payment_uuid uuid,
  renewed boolean
)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_payment pauperwave_payments;
  v_renewed boolean := false;
begin
  insert into pauperwave_payments (
    associate_uuid, payer_name, payer_surname, payer_email, payer_tax_code,
    payment_date, payment_amount, payment_method, payment_type, received_by,
    tournament_uuid, event_uuid, event_name, notes, created_by, updated_by
  ) values (
    p_associate_uuid, p_payer_name, p_payer_surname, p_payer_email, p_payer_tax_code,
    p_payment_date, p_payment_amount, p_payment_method, p_payment_type, p_received_by,
    p_tournament_uuid, p_event_uuid, p_event_name, coalesce(p_notes, ''), p_created_by, p_created_by
  )
  returning * into v_payment;

  if v_payment.payment_type = 'Association Fee' and v_payment.associate_uuid is not null then
    v_renewed := ensure_payment_renewal(v_payment.associate_uuid, v_payment.payment_date);
  end if;

  return query select v_payment.id, v_payment.uuid, v_renewed;
end;
$function$;

create function public.update_payment_with_renewal(
  p_id bigint,
  p_associate_uuid uuid,
  p_payer_name text,
  p_payer_surname text,
  p_payer_email text,
  p_payer_tax_code text,
  p_payment_date timestamptz,
  p_payment_amount numeric,
  p_payment_method text,
  p_payment_type text,
  p_received_by text,
  p_tournament_uuid uuid,
  p_event_uuid uuid,
  p_event_name text,
  p_notes text,
  p_updated_by uuid
)
returns table (
  updated_payment_id bigint,
  updated_payment_uuid uuid,
  renewed boolean
)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_previous pauperwave_payments;
  v_payment pauperwave_payments;
  v_renewed boolean := false;
  v_target_changed boolean;
begin
  select * into v_previous from pauperwave_payments where id = p_id for update;
  if not found then
    raise exception 'Transaction % not found', p_id using errcode = 'P0002';
  end if;

  update pauperwave_payments set
    associate_uuid = p_associate_uuid,
    payer_name = p_payer_name,
    payer_surname = p_payer_surname,
    payer_email = p_payer_email,
    payer_tax_code = p_payer_tax_code,
    payment_date = p_payment_date,
    payment_amount = p_payment_amount,
    payment_method = p_payment_method,
    payment_type = p_payment_type,
    received_by = p_received_by,
    tournament_uuid = p_tournament_uuid,
    event_uuid = p_event_uuid,
    event_name = p_event_name,
    notes = coalesce(p_notes, ''),
    updated_by = p_updated_by,
    updated_at = now()
  where id = p_id
  returning * into v_payment;

  v_target_changed := v_previous.associate_uuid is distinct from v_payment.associate_uuid
    or extract(year from v_previous.payment_date) is distinct from extract(year from v_payment.payment_date);

  if v_previous.payment_type = 'Association Fee' and v_previous.associate_uuid is not null
    and v_target_changed then
    perform remove_stale_payment_renewal(v_previous.associate_uuid, v_previous.payment_date, p_id);
  end if;

  if v_payment.payment_type = 'Association Fee' and v_payment.associate_uuid is not null then
    v_renewed := ensure_payment_renewal(v_payment.associate_uuid, v_payment.payment_date);
  end if;

  return query select v_payment.id, v_payment.uuid, v_renewed;
end;
$function$;

create function public.delete_payment_with_renewal(
  p_id bigint,
  p_deleted_by uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_payment pauperwave_payments;
begin
  update pauperwave_payments
  set deleted_at = now(), deleted_by = p_deleted_by
  where id = p_id
  returning * into v_payment;

  if not found then
    raise exception 'Transaction % not found', p_id using errcode = 'P0002';
  end if;

  if v_payment.payment_type = 'Association Fee' and v_payment.associate_uuid is not null then
    perform remove_stale_payment_renewal(v_payment.associate_uuid, v_payment.payment_date, null);
  end if;
end;
$function$;
