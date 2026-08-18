-- Age computed at query time (never stored), same convention as
-- membership_status/latest_renewal_year in this view. Backs the roster's
-- "Età" column (previously computed client-side in
-- useAssociatesTableColumns.ts via date-fns) and /statistics' median-age
-- stat, and is the DB-level mechanism the birthday-notification backlog
-- item (docs/BACKLOG.md) will build on. age(current_date, born_date) then
-- extract(year ...) gives whole completed years, leap-year-safe.
-- Appended last, not next to born_date's source column — CREATE OR REPLACE
-- VIEW can only add columns at the end (see 20260818120000's own note).
create or replace view public.pauperwave_associates_with_status
with (security_invoker = true) as
select
  a.*,
  r.latest_renewal_year,
  case
    when a.membership_request_status <> 'approved' then a.membership_request_status
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
