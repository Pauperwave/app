-- Cache dei dati catalogo di CardTrader (docs/PROGRESS.md, feasibility study
-- 2026-08-08): la loro API non offre una ricerca full-text per nome, solo
-- GET /blueprints/export?expansion_id=X che restituisce l'intero set (anche
-- migliaia di righe). pauperwave_cardtrader_blueprints salva solo le righe
-- effettivamente richieste da una wanted-card (filtrate in memoria dal BFF,
-- vedi server/api/cardtrader/resolve.get.ts), non l'intero export — le
-- wanted-cards sono poche, non vale tenere a DB migliaia di righe mai lette.
-- Il costo accettato: una carta NUOVA di un set già visto rifà la stessa
-- chiamata esterna (nessun modo di evitarlo senza cachare tutto il set).
-- pauperwave_cardtrader_expansions invece si presta a cache totale: è un
-- solo elenco compatto (set MTG disponibili), riusato per ogni lookup.
create table public.pauperwave_cardtrader_expansions (
  -- id di CardTrader stesso (non generato da noi) — è la chiave con cui
  -- richiedere GET /blueprints/export?expansion_id=.
  id integer primary key,
  -- Codice set, stessa convenzione di Scryfall (es. 'sld'), usato per il
  -- join da set_code Scryfall a expansion_id CardTrader.
  code text not null,
  name text not null,
  game_id integer not null,
  synced_at timestamptz not null default now()
);

create table public.pauperwave_cardtrader_blueprints (
  -- id di CardTrader, è il numero che compone l'URL della scheda carta
  -- (cardtrader.com/en/cards/{id}).
  id integer primary key,
  scryfall_id uuid not null unique,
  expansion_id integer not null references public.pauperwave_cardtrader_expansions (id),
  name text not null,
  synced_at timestamptz not null default now()
);
create index on public.pauperwave_cardtrader_blueprints (scryfall_id);

-- Scritte solo dal BFF (service role, bypassa RLS) al lookup lazy; nessuna
-- policy di lettura per il client perché nulla legge questa tabella
-- direttamente — solo l'endpoint resolve.get.ts, che restituisce l'URL già
-- risolto, non le righe grezze.
alter table public.pauperwave_cardtrader_expansions enable row level security;
alter table public.pauperwave_cardtrader_blueprints enable row level security;
