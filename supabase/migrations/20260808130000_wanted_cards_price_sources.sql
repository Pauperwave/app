-- Due fonti di prezzo distinte per una wanted-card (discussione 2026-08-08,
-- docs/PROGRESS.md): CardMarket (via Scryfall, già presente ma senza nome
-- esplicito) e CardTrader (nuovo, vedi server/utils/cardTrader.ts). Rename
-- per coerenza di naming prima di aggiungere la seconda fonte, così nessuna
-- colonna "price" ambigua resta a fianco di "cardtrader_price".
-- *_synced_at tracciano quando ciascun prezzo è stato aggiornato l'ultima
-- volta — refresh manuale (endpoint) o settimanale (script + GitHub Action),
-- non un valore live ricalcolato a ogni lettura.
alter table public.pauperwave_wanted_cards
  rename column price to cardmarket_price;

alter table public.pauperwave_wanted_cards
  add column cardmarket_price_synced_at timestamptz,
  add column cardtrader_price numeric(10, 2),
  add column cardtrader_price_synced_at timestamptz;
