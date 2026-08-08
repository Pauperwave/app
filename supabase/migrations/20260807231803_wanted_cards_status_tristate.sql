-- Sostituisce il booleano `found` con uno stato a tre valori: una richiesta
-- può anche essere abbandonata (il giocatore non la cerca più) senza essere
-- stata trovata — prima le uniche opzioni erano true/false, che confondeva
-- "trovata" con "non cerco più" nelle statistiche.
alter table public.pauperwave_wanted_cards
  add column status text not null default 'searching'
    check (status in ('searching', 'found', 'abandoned'));

update public.pauperwave_wanted_cards
  set status = case when found then 'found' else 'searching' end;

alter table public.pauperwave_wanted_cards
  drop column found;

-- Il trigger di found_at (migrazione 20260807230702) va ricreato attorno a
-- status invece di found.
drop trigger set_wanted_card_found_at on public.pauperwave_wanted_cards;
drop function public.set_wanted_card_found_at();

create function public.set_wanted_card_found_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'found' and old.status <> 'found' then
    new.found_at := now();
  elsif new.status <> 'found' then
    new.found_at := null;
  end if;
  return new;
end;
$$;

create trigger set_wanted_card_found_at
  before update on public.pauperwave_wanted_cards
  for each row
  execute function public.set_wanted_card_found_at();
