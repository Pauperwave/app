-- app/types/index.d.ts's AssociateType was 'ordinario' | 'sostenitore' — Italian
-- baked into stored data instead of being a display-only translation. Renamed to
-- English ('regular' | 'sustaining'); it.json's associate.types.* now owns the
-- Italian label. All 242 rows were 'ordinario' at the time of this migration
-- (see 20260810120000_backfill_associate_type_default.sql), none 'sostenitore'.
update public.pauperwave_associates
set associate_type = 'regular'
where associate_type = 'ordinario';

update public.pauperwave_associates
set associate_type = 'sustaining'
where associate_type = 'sostenitore';
