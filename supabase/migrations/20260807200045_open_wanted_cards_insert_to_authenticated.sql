-- Qualsiasi utente autenticato può creare una richiesta di carta cercata —
-- sono i giocatori stessi a farlo nell'uso reale, non la gestione. update/
-- delete restano riservati a has_management_permissions (vedi migrazione
-- precedente e il TODO in docs/TODO.md sul permesso "Elimina" solo admin):
-- modificare/eliminare una richiesta esistente rompe le statistiche, crearne
-- una nuova no.
drop policy "Management can insert wanted cards" on public.pauperwave_wanted_cards;

create policy "Authenticated users can insert wanted cards"
  on public.pauperwave_wanted_cards
  for insert
  to authenticated
  with check (true);
