-- Schema per il "Campionato Cittadino" (docs/BACKLOG.md, P1): un'edizione è
-- year-scoped ("una cosa che dura ad esempio un anno", come descritto
-- dall'utente 2026-08-09) — non è una lega né un evento, è un asse
-- ortogonale a entrambi.
--
-- cittadino_edition_uuid su tournaments è nullable e indipendente da
-- league_uuid/event_uuid: quel FK *è* l'interruttore "vale per il
-- cittadino" per singolo torneo. Lasciarlo NULL è come si escludono finali
-- e side event dal conteggio.
create table public.cittadino_editions (
  id bigint generated always as identity primary key,
  uuid uuid not null default gen_random_uuid() unique,
  year integer not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cittadino_editions enable row level security;

create policy "Authenticated users can read cittadino editions"
  on public.cittadino_editions
  for select
  to authenticated
  using (true);

-- auth.uid() wrapped in (select ...) so it's evaluated once per statement,
-- not once per row (Supabase RLS performance guidance) — not how the
-- earlier wanted_cards policies were written, but worth doing right on a
-- new table rather than copying that forward.
create policy "Management can insert cittadino editions"
  on public.cittadino_editions
  for insert
  to authenticated
  with check (has_management_permissions((select auth.uid())));

create policy "Management can update cittadino editions"
  on public.cittadino_editions
  for update
  to authenticated
  using (has_management_permissions((select auth.uid())))
  with check (has_management_permissions((select auth.uid())));

create policy "Management can delete cittadino editions"
  on public.cittadino_editions
  for delete
  to authenticated
  using (has_management_permissions((select auth.uid())));

-- Stesso trigger generico introdotto in 20260808063237_wanted_cards_audit_columns.sql
-- (public.set_updated_at() è già create or replace, quindi idempotente).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_cittadino_editions_updated_at
  before update on public.cittadino_editions
  for each row
  execute function public.set_updated_at();

alter table public.tournaments
  add column cittadino_edition_uuid uuid references public.cittadino_editions (uuid);

-- Postgres doesn't auto-index FK columns — without this, both the standings
-- query (WHERE cittadino_edition_uuid = ...) and any future ON DELETE
-- behavior on cittadino_editions would force a sequential scan of tournaments.
create index tournaments_cittadino_edition_uuid_idx
  on public.tournaments (cittadino_edition_uuid);
