-- 103 di 242 associati avevano associate_type = NULL (verificato 2026-08-10),
-- perché la colonna non è mai stata valorizzata per le richieste più vecchie.
-- L'app trattava già 'ordinario' come default visivo per queste righe — questa
-- migration allinea il dato reale a quel default invece di continuare a
-- mascherarlo lato frontend (vedi app/pages/(community)/associates/index.vue,
-- renderAssociateTypeBadge).
update public.pauperwave_associates
set associate_type = 'ordinario'
where associate_type is null;
