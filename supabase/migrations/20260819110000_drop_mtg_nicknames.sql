-- Drop mtgo_nickname/mtga_nickname (user request, 2026-08-19) — unused across
-- the whole membership base: 0 of 323 associates had either set (verified via
-- `supabase db query` before writing this migration). Feature removed
-- app-wide in the same change (AddModal.vue/EditModal.vue/tesseramento,
-- table columns, detail page section).
--
-- pauperwave_associates_with_status (a.*-based) depends on these columns —
-- CREATE OR REPLACE VIEW can only add columns at the end (see
-- 20260818160000's own note), not remove ones in the middle, so the view is
-- dropped and recreated instead. Definition below is otherwise unchanged
-- from 20260818161000 (last migration to touch it).
drop view public.pauperwave_associates_with_status;

alter table public.pauperwave_associates
  drop column mtgo_nickname,
  drop column mtga_nickname;

create view public.pauperwave_associates_with_status
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
