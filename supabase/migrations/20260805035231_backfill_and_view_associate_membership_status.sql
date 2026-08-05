-- Backfill: crea uno storico di rinnovi retroattivo per gli associati già approvati,
-- usando l'anno di association_date (o payment_date se association_date è mancante)
-- come primo rinnovo noto. Idempotente grazie al vincolo
-- uq_pauperwave_associate_renewals_unique_year su (associate_uuid, renewal_year).
insert into public.pauperwave_associate_renewals (associate_uuid, renewal_year, renewal_date)
select
  a.uuid,
  extract(year from coalesce(a.association_date, a.payment_date))::smallint,
  coalesce(a.association_date, a.payment_date)
from public.pauperwave_associates a
where a.membership_request_status = 'approved'
  and coalesce(a.association_date, a.payment_date) is not null
on conflict (associate_uuid, renewal_year) do nothing;

-- Stato di tesseramento calcolato al volo (mai salvato come colonna): confronta
-- l'ultimo anno di rinnovo con l'anno solare corrente. Sostituisce concettualmente
-- la colonna associate_status (sempre nulla), evitando la stessa ambiguità a due
-- fonti di verità già vista con membership_request_status.
-- security_invoker fa rispettare le policy RLS di chi interroga la view, non del
-- suo proprietario.
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
  end as membership_status
from public.pauperwave_associates a
left join (
  select associate_uuid, max(renewal_year) as latest_renewal_year
  from public.pauperwave_associate_renewals
  group by associate_uuid
) r on r.associate_uuid = a.uuid;

grant select on public.pauperwave_associates_with_status to authenticated;
