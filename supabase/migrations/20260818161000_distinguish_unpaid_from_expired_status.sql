-- membership_status conflated two different situations under 'expired':
-- someone who WAS active and let their membership lapse, and someone who was
-- just approved and has never had a single renewal/payment recorded at all
-- (latest_renewal_year is null in both branches previously, both fell to the
-- catch-all "else 'expired'"). The second case isn't a lapse — it's just
-- "no payment registered yet, they only just submitted /tesseramento" (user
-- correction, 2026-08-18). Confirmed this affects exactly 13 associates
-- today (13 of the 81 imported in 20260818150000 have no data_pagamento in
-- the source roster, so got no renewal row).
--
-- Rebuilt on top of 20260818160000_add_age_to_associates_view.sql's shape
-- (age column) rather than the version from before it, to avoid two
-- migrations racing to redefine the same view.
create or replace view public.pauperwave_associates_with_status
with (security_invoker = true) as
select
  a.*,
  r.latest_renewal_year,
  case
    when a.membership_request_status <> 'approved' then a.membership_request_status
    when r.latest_renewal_year is null then 'unpaid'
    when r.latest_renewal_year = extract(year from current_date)::smallint then 'active'
    when r.latest_renewal_year = extract(year from current_date)::smallint - 1 then 'to_renew'
    else 'expired'
  end as membership_status,
  r.latest_renewal_date,
  case
    when a.born_date is null then null
    else extract(year from age(current_date, a.born_date))::int
  end as age
from public.pauperwave_associates a
left join (
  select
    associate_uuid,
    max(renewal_year) as latest_renewal_year,
    max(renewal_date) as latest_renewal_date
  from public.pauperwave_associate_renewals
  group by associate_uuid
) r on r.associate_uuid = a.uuid;

grant select on public.pauperwave_associates_with_status to authenticated;
