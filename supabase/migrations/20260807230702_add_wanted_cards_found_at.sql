-- Serve per calcolare statistiche come "tempo medio per trovare una carta" —
-- prima non c'era modo di saperlo: found era solo un booleano, e requested_at
-- dice solo quando è stata creata la richiesta, non quando è stata trovata.
--
-- Il timestamp viene impostato da un trigger, non dall'app (vedi
-- setFound() in useWantedCards.ts), così resta corretto qualsiasi client/
-- percorso di codice tocchi la colonna found in futuro, non solo quello
-- attuale.
alter table public.pauperwave_wanted_cards
  add column found_at timestamptz;

create function public.set_wanted_card_found_at()
returns trigger
language plpgsql
as $$
begin
  if new.found and not old.found then
    new.found_at := now();
  elsif not new.found then
    new.found_at := null;
  end if;
  return new;
end;
$$;

create trigger set_wanted_card_found_at
  before update on public.pauperwave_wanted_cards
  for each row
  execute function public.set_wanted_card_found_at();
