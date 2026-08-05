-- associate_status è sempre NULL per tutti i 242 record esistenti (verificato) ed
-- è concettualmente sostituito da membership_status, calcolato in
-- pauperwave_associates_with_status. Va rimossa per non riportare la stessa
-- ambiguità a due fonti di verità già vista con membership_request_status.
--
-- La view dipende da questa colonna tramite "a.*", quindi va ricreata da zero
-- attorno alla nuova forma della tabella.
drop view if exists public.pauperwave_associates_with_status;

alter table public.pauperwave_associates
  drop column associate_status;

create view public.pauperwave_associates_with_status
with (security_invoker = true) as
select
  a.*,
  r.latest_renewal_year,
  case
    when a.membership_request_status <> 'approved' then a.membership_request_status
    when r.latest_renewal_year = extract(year from current_date)::smallint then 'active'
    when r.latest_renewal_year = extract(year from current_date)::smallint - 1 then 'to_renew'
    else 'expired'
  end as membership_status
from public.pauperwave_associates a
left join (
  select associate_uuid, max(renewal_year) as latest_renewal_year
  from public.pauperwave_associate_renewals
  group by associate_uuid
) r on r.associate_uuid = a.uuid;

grant select on public.pauperwave_associates_with_status to authenticated;
