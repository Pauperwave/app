-- Cache delle coordinate geocodificate per la vista mappa degli associati
-- (Associati > Mappa). Tabella separata, non colonne su pauperwave_associates:
-- le coordinate sono un dato derivato/cache (invalidato quando cambia
-- l'indirizzo di residenza), non un attributo anagrafico dell'associato.
-- Popolata da uno script batch one-off (scripts/geocode-associates.mjs) che
-- interroga Nominatim (OpenStreetMap) con la service role key; il client
-- legge soltanto.
create table public.pauperwave_associate_geocodes (
  associate_uuid uuid primary key references public.pauperwave_associates (uuid) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  geocoded_at timestamptz not null default now()
);

alter table public.pauperwave_associate_geocodes enable row level security;

create policy "Authenticated users can read associate geocodes"
  on public.pauperwave_associate_geocodes
  for select
  to authenticated
  using (true);
