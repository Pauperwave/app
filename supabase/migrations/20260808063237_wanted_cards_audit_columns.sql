-- created_by/updated_by esistono già ma non sono mai stati popolati (nessun
-- trigger, nessun endpoint li scrive) — vedi discussione in docs/PROGRESS.md.
-- Retarget da auth.users(id) a pauperwave_associates(uuid): stesso pattern
-- già usato per player_associate_uuid, permette di mostrare nome/avatar in
-- UI con un join diretto, senza mai dover chiamare l'admin API di Supabase
-- per risolvere un id utente auth a un nome visualizzabile.
alter table public.pauperwave_wanted_cards
  drop constraint if exists pauperwave_wanted_cards_created_by_fkey,
  drop constraint if exists pauperwave_wanted_cards_updated_by_fkey;

alter table public.pauperwave_wanted_cards
  add constraint pauperwave_wanted_cards_created_by_fkey
    foreign key (created_by) references public.pauperwave_associates (uuid) on delete set null,
  add constraint pauperwave_wanted_cards_updated_by_fkey
    foreign key (updated_by) references public.pauperwave_associates (uuid) on delete set null;

-- Rete di sicurezza generica per updated_at: non dipende da auth.uid() (che
-- sarebbe sempre null con la service-role key usata dal layer BFF, vedi
-- ADR-007) — cattura anche eventuali scritture dirette via SQL/dashboard,
-- non solo quelle dai nostri endpoint. La funzione è generica (nessun
-- riferimento a wanted_cards), pensata per essere riattaccata as-is alle
-- altre tabelle con created_by/updated_by quando arriverà il loro turno.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_wanted_cards_updated_at
  before update on public.pauperwave_wanted_cards
  for each row
  execute function public.set_updated_at();
