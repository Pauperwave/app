-- pauperwave_associates.payment_date is a one-time snapshot from initial signup
-- (see 20260805035231) that's never updated on renewal — the app's "Pagamento"
-- column was reading it and silently showing a stale date for anyone who has
-- since renewed. The real renewal history lives in pauperwave_associate_renewals
-- (already aggregated here as latest_renewal_year); exposing its max renewal_date
-- too so the UI can show what it actually claims to.
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
  -- Appended last (not next to latest_renewal_year) — CREATE OR REPLACE VIEW can only
  -- add columns at the end, or Postgres reads it as renaming an existing column
  -- (confirmed: SQLSTATE 42P16 when this was placed before membership_status).
  r.latest_renewal_date
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
