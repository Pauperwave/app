-- Backfills pre-existing NULL created_by/updated_by rows in both tables
-- that have a working audit trail (docs/supabase/2-database.md), attributed
-- to Emanuele Nardi's associate uuid — decided explicitly by the user
-- 2026-08-18, aware that most pauperwave_wanted_cards rows were actually
-- requested by other associates (the real requester stays tracked
-- separately via player_associate_uuid; created_by/updated_by is a
-- "who touched the record" audit trail, not a requester field).
--
-- 242/242 created_by and 240/242 updated_by were NULL on pauperwave_associates;
-- 46/68 created_by and 31/68 updated_by were NULL on pauperwave_wanted_cards
-- (counts confirmed immediately before writing this migration).

UPDATE public.pauperwave_associates
SET created_by = 'bf7160b3-a2a6-4624-bc9c-ca0fbcb13672'
WHERE created_by IS NULL;

UPDATE public.pauperwave_associates
SET updated_by = 'bf7160b3-a2a6-4624-bc9c-ca0fbcb13672'
WHERE updated_by IS NULL;

UPDATE public.pauperwave_wanted_cards
SET created_by = 'bf7160b3-a2a6-4624-bc9c-ca0fbcb13672'
WHERE created_by IS NULL;

UPDATE public.pauperwave_wanted_cards
SET updated_by = 'bf7160b3-a2a6-4624-bc9c-ca0fbcb13672'
WHERE updated_by IS NULL;
