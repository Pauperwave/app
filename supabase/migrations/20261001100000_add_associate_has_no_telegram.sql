-- supabase\migrations\20261001100000_add_associate_has_no_telegram.sql
-- Associates who don't use (and won't install) Telegram: the organizer has to enter their
-- results and commander for them. Editable from the associate edit form (user request, 2026-10-01).
alter table public.pauperwave_associates
  add column has_no_telegram boolean not null default false;

-- The view's own column list is fixed at creation time, so it has to be recreated to expose the
-- new column — appended last, which is all `create or replace` allows.
create or replace view public.pauperwave_associates_with_status
  with (security_invoker = true) as
select
  a.id,
  a.uuid,
  a.created_at,
  a.updated_at,
  a.membership_request_status,
  a.request_date,
  a.payment_date,
  a.association_date,
  a.pauperwave_associate_number,
  a.consent_data,
  a.consent_social,
  a.has_read_statute,
  a.has_acknowledged_surveillance_notice,
  a.associate_type,
  a.first_name,
  a.last_name,
  a.tax_code,
  a.phone_number,
  a.email_address,
  a.born_location,
  a.born_date,
  a.born_province,
  a.born_state,
  a.residency_address,
  a.residency_house_number,
  a.residency_city,
  a.residency_province,
  a.residency_cap,
  a.updated_by,
  a.created_by,
  r.latest_renewal_year,
  case
    when a.membership_request_status <> 'approved'::text then a.membership_request_status
    when r.latest_renewal_year is null then 'unpaid'::text
    when r.latest_renewal_year = extract(year from current_date)::smallint then 'active'::text
    when r.latest_renewal_year = (extract(year from current_date)::smallint - 1) then 'to_renew'::text
    else 'expired'::text
  end as membership_status,
  r.latest_renewal_date,
  case
    when a.born_date is null then null::integer
    else extract(year from age(current_date::timestamp with time zone, a.born_date::timestamp with time zone))::integer
  end as age,
  a.has_no_telegram
from public.pauperwave_associates a
left join (
  select
    pauperwave_associate_renewals.associate_uuid,
    max(pauperwave_associate_renewals.renewal_year) as latest_renewal_year,
    max(pauperwave_associate_renewals.renewal_date) as latest_renewal_date
  from public.pauperwave_associate_renewals
  group by pauperwave_associate_renewals.associate_uuid
) r on r.associate_uuid = a.uuid;

update public.pauperwave_associates
set has_no_telegram = true
where (first_name, last_name) in (
  ('Alessandro', 'Bignami'),
  ('Lorenzo', 'Mattedi'),
  ('Eric', 'Vicentini')
);
