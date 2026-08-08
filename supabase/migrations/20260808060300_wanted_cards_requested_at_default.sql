-- `requested_at` non ha mai avuto un default (era `found_at date` senza
-- default nella migrazione originale, poi solo rinominata) — ogni richiesta
-- creata da AddModal.vue nasce quindi con requested_at = null, dato che
-- server/api/wanted-cards/create.post.ts non la imposta esplicitamente.
-- Un default a livello DB è più robusto di settarla lato codice (stesso
-- ragionamento del trigger found_at): vale per ogni futuro path di insert,
-- non solo per questo endpoint.
alter table public.pauperwave_wanted_cards
  alter column requested_at set default current_date;

-- Backfill delle righe già create senza data (tutte inserite oggi durante
-- lo sviluppo di questa feature).
update public.pauperwave_wanted_cards
  set requested_at = current_date
  where requested_at is null;
