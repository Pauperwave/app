-- Serve a risolvere il link diretto CardTrader (server/api/cardtrader/
-- resolve.get.ts, vedi feasibility study 2026-08-08 in docs/PROGRESS.md):
-- finora si salvava solo scryfall_url, che non basta a identificare la
-- stampa esatta per un join con CardTrader (serve lo scryfall_id UUID e il
-- set code, entrambi già disponibili da ScryfallPrinting al momento della
-- scelta della carta — semplicemente non venivano persistiti).
-- Nullable: le wanted-cards esistenti non hanno questi dati e non li
-- retroattiviamo (nessuna fonte per derivarli da scryfall_url a ritroso in
-- modo affidabile).
alter table public.pauperwave_wanted_cards
  add column scryfall_id uuid,
  add column set_code text;
