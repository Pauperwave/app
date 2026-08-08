-- Tabella per la feature "Carte Cercate" (/wanted-cards), finora solo dati
-- statici in app/pages/(community)/wanted-cards/index.vue (vedi ADR-005/006
-- in docs/PROGRESS.md). Colonne ricalcate 1:1 sui campi dell'interfaccia
-- WantedCard esistente (app/types/index.d.ts).
--
-- Deliberatamente agnostica dal formato giocato: nessuna colonna di legalità/
-- formato — coerente con l'obiettivo dell'app di diventare un gestionale
-- multi-formato (Pauper, Commander, Premodern, Draft, ...), non solo Pauper
-- (vedi nota di scope in docs/TODO.md sull'audit dello schema).
--
-- player_associate_uuid è una FK verso pauperwave_associates invece di un
-- nome testuale come nel JSON statico: evita drift di nome/typo e riusa
-- l'identità/avatar già modellati lì.
create table public.pauperwave_wanted_cards (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  player_associate_uuid uuid not null references public.pauperwave_associates (uuid) on delete cascade,
  card_name text not null,
  scryfall_url text,
  mana_cost text,
  color_identity text[] not null default '{}',
  cmc integer,
  image_url text,
  copies integer not null default 1,
  -- null = "Indifferente" (nessuna preferenza), non stringa vuota.
  language text,
  treatment text[] not null default '{}',
  price numeric(10, 2),
  notes text,
  found boolean not null default false,
  -- Data in cui la carta è stata trovata (null finché found = false).
  found_at date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.pauperwave_wanted_cards enable row level security;

-- Lettura aperta a tutti gli utenti autenticati (come pauperwave_associates).
create policy "Authenticated users can read wanted cards"
  on public.pauperwave_wanted_cards
  for select
  to authenticated
  using (true);

-- Scrittura riservata alla gestione finché non esiste un modo verificato di
-- risalire dall'utente autenticato al proprio associate_uuid (vedi TODO in
-- docs/TODO.md sul permesso "Elimina" solo admin) — non solo per il delete,
-- ma per ogni scrittura, dato che eliminare/alterare una richiesta rompe le
-- statistiche allo stesso modo.
create policy "Management can insert wanted cards"
  on public.pauperwave_wanted_cards
  for insert
  to authenticated
  with check (has_management_permissions(auth.uid()));

create policy "Management can update wanted cards"
  on public.pauperwave_wanted_cards
  for update
  to authenticated
  using (has_management_permissions(auth.uid()))
  with check (has_management_permissions(auth.uid()));

create policy "Management can delete wanted cards"
  on public.pauperwave_wanted_cards
  for delete
  to authenticated
  using (has_management_permissions(auth.uid()));
