# Permissions matrix

<!-- docs/architecture/permissions.md -->

Human-readable companion to `docs/architecture/roles.md` — that doc has the implementation (`ROLE_LEVEL`/`PERMISSION_LEVEL`, `can()`, the middleware/plugin plan); this one is the reference table for "who can do what," at a coarser grain than a boolean. Written 2026-08-10, alongside the associate/player/`app_role` distinction in `docs/architecture/database.md`.

## Legend

- 🟢 Accesso completo
- 🟡 Accesso parziale — solo i propri dati/azioni, non quelli altrui
- 🔴 Nessun accesso

🟡 rows are not expressible as a single `can()` boolean — they need the data itself scoped to the logged-in user (a `WHERE` clause or an RLS policy keyed on `auth.uid()`), not just a route/button gate. See `docs/architecture/roles.md`'s "Goal" section: this is exactly the "different **content**, not just different **permissions**" case.

## Matrix

**Rivista 2026-08-10: 4 livelli, non più 3** — `super_admin` aggiunto sopra `admin`, e la parte finanziaria è stata spezzata in due (quote associative vs. pagamenti eventi/tornei — categorie già distinte in `pauperwave_payments.payment_type`: `'Association Fee'` vs `'Event'`).

| Funzionalità | player | organizer | admin | super-admin |
|---|:---:|:---:|:---:|:---:|
| Visualizzare classifiche (Cittadino, Commander, Premodern, Pauper) | 🟢 | 🟢 | 🟢 | 🟢 |
| Visualizzare tornei, leghe, eventi | 🟢 | 🟢 | 🟢 | 🟢 |
| Iscriversi a un torneo/evento | 🟡 (solo per sé stesso) | 🟢 | 🟢 | 🟢 |
| Creare, modificare tornei/leghe/eventi (inclusa la gestione ordinaria dei round) | 🔴 | 🟢 | 🟢 | 🟢 |
| **Eliminare definitivamente** tornei/leghe/eventi | 🔴 | 🔴 | 🔴 | 🟢 |
| **Annullare un round** | 🔴 | 🔴 | 🔴 | 🟢 |
| Gestire pagamenti di eventi/tornei | 🔴 | 🟢 | 🟢 | 🟢 |
| Visualizzare "Carte Cercate" | 🟢 | 🟢 | 🟢 | 🟢 |
| Creare una richiesta "Carta Cercata" | 🟡 (solo per sé stesso) | 🟢 | 🟢 | 🟢 |
| Cambiare stato (trovata/abbandonata) della propria richiesta | 🟡 (solo la propria) | 🟢 | 🟢 | 🟢 |
| Eliminare la propria richiesta | 🔴 | 🟢 | 🟢 | 🟢 |
| Modificare/eliminare/cambiare stato di una richiesta altrui | 🔴 | 🟢 | 🟢 | 🟢 |
| Gestire i propri mazzi Commander | 🟢 | 🟢 | 🟢 | 🟢 |
| Gestire i mazzi Commander di tutti i giocatori | 🔴 | 🔴 | 🟢 | 🟢 |
| Visualizzare il proprio stato di tesseramento/dati anagrafici | 🟡 (solo il proprio) | 🟡 (solo il proprio) | 🟢 (tutti i soci) | 🟢 (tutti i soci) |
| Gestire l'anagrafica soci (`/associates`) | 🔴 | 🔴 | 🟢 | 🟢 |
| Gestire le quote associative | 🔴 | 🔴 | 🟢 | 🟢 |
| Assegnare/modificare ruoli (`/settings/members`) | 🔴 | 🔴 | 🔴 | 🟢 |

## Note

**"Carte Cercate" oggi *non* rispetta ancora questa matrice — deciso 2026-08-10, da correggere nel codice.** `server/api/wanted-cards/create.post.ts` usa solo `requireUser` (corretto, chiunque loggato crea la propria richiesta); ma `[id]/status.post.ts` usa oggi `requireManagementPermission`, quindi anche segnare una **propria** richiesta come "trovata"/"abbandonata" richiede un ruolo di gestione — comportamento sbagliato, confermato dall'utente. Un giocatore deve avere pieno controllo sullo stato delle proprie richieste; l'unica cosa che deve restare riservata alla gestione è l'**eliminazione** della richiesta (`[id]/delete.post.ts`, invariato). Il fix è in `server/api/wanted-cards/[id]/status.post.ts`: accettare anche il creatore della richiesta (owner-check sul `player_associate_uuid`/creator, come `player_own_registration` nei backup docs), non solo `requireManagementPermission` — vedi `docs/BACKLOG.md` P2. `[id]/update.post.ts` e `[id]/refresh-prices.post.ts` non sono stati toccati da questa decisione, restano `requireManagementPermission`.

**"Annullare un round" è un'eccezione ritagliata dalla gestione ordinaria dei tornei, confermata 2026-08-10.** Un organizer gestisce un torneo dall'inizio alla fine — inclusi i round, normalmente — ma annullare un round già avviato è trattato come l'eliminazione definitiva: un'azione distruttiva/irreversibile che va oltre l'amministrazione ordinaria, riservata a `super_admin` anche se il torneo nel suo complesso resta gestibile da `organizer`.

**"Eliminare definitivamente" non si applica ai soci.** A differenza di tornei/leghe/eventi, un associato oggi non viene mai cancellato per davvero — lo stato di tesseramento è calcolato dal confronto fra l'ultimo `renewal_year` in `pauperwave_associate_renewals` e l'anno corrente (`docs/architecture/database.md`, "Membership status model"): un socio non rinnovato resta visibile con l'ultima data di rinnovo nota, non sparisce. Non serve quindi un permesso "elimina socio" riservato a super_admin — la gestione anagrafica di `admin` è già sufficiente. Soft-delete vero e proprio (per tornei/leghe/eventi, o altrove) è pianificato ma non ancora scoped — quando arriva, va deciso se "eliminazione definitiva" resta super_admin-only anche con un soft-delete di mezzo, o se il soft-delete stesso diventa disponibile ad `admin` e solo la purga fisica resta a `super_admin`.

**`organizer`, `admin` e `super-admin` sono oggi indistinguibili per tutto ciò che passa da `has_management_permissions`.** Quella funzione Postgres è un controllo binario ("è staff o no"), non a livelli — per "Carte Cercate" (l'unico dominio con scritture BFF già costruite) i tre hanno esattamente gli stessi permessi. La distinzione a più livelli di questa matrice riguarda solo le funzionalità **non ancora costruite** (`/associates`, quote, pagamenti eventi, gestione ruoli, mazzi altrui, eliminazione definitiva) — è lì che serve il nuovo modello `ROLE_LEVEL`/`can()` di `roles.md`, non `has_management_permissions`. Se in futuro anche le scritture di "Carte Cercate" devono distinguere fra i tre, `has_management_permissions` stessa andrebbe rivista, non solo la UI.

**Mazzi Commander, ora due righe separate** (prima era un'unica riga 🟡 per tutti — corretto 2026-08-10): gestire i **propri** mazzi è 🟢 per chiunque, sempre (stesso `player_own_decks` ownership-check dei backup docs, indipendente dal ruolo); gestire i mazzi **di chiunque altro** è una capacità a parte, riservata ad admin e super-admin.

## Aggiornare questa matrice

Ogni volta che si aggiunge un `Permission` a `PERMISSION_LEVEL` in `app/utils/permissions.ts` (`docs/architecture/roles.md`, §2), aggiungere una riga qui — sono la stessa fonte di verità raccontata in due formati diversi (codice vs. tabella leggibile), non due decisioni separate.
