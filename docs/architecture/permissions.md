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
| Creare, modificare, eliminare tornei/leghe/eventi | 🔴 | 🟢 | 🟢 | 🟢 |
| Gestire pagamenti di eventi/tornei | 🔴 | 🟢 | 🟢 | 🟢 |
| Visualizzare "Carte Cercate" | 🟢 | 🟢 | 🟢 | 🟢 |
| Creare una richiesta "Carta Cercata" | 🟡 (solo per sé stesso) | 🟢 | 🟢 | 🟢 |
| Modificare/eliminare/cambiare stato di una richiesta altrui | 🔴 | 🟢 | 🟢 | 🟢 |
| Gestire i propri mazzi Commander | 🟢 | 🟢 | 🟢 | 🟢 |
| Gestire i mazzi Commander di tutti i giocatori | 🔴 | 🔴 | 🟢 | 🟢 |
| Visualizzare il proprio stato di tesseramento/dati anagrafici | 🟡 (solo il proprio) | 🟡 (solo il proprio) | 🟢 (tutti i soci) | 🟢 (tutti i soci) |
| Gestire l'anagrafica soci (`/associates`) | 🔴 | 🔴 | 🟢 | 🟢 |
| Gestire le quote associative | 🔴 | 🔴 | 🟢 | 🟢 |
| Assegnare/modificare ruoli (`/settings/members`) | 🔴 | 🔴 | 🔴 | 🟢 |

## Note

**"Carte Cercate" oggi è già così, verificato nel codice — non è un piano futuro.** `server/api/wanted-cards/create.post.ts` usa solo `requireUser` (chiunque loggato crea la propria richiesta); `[id]/{delete,update,status,refresh-prices}.post.ts` usano tutti `requireManagementPermission` — persino segnare una propria richiesta come "trovata" richiede oggi un ruolo di gestione, non solo essere il richiedente. Se in futuro un player deve poter gestire (non solo creare) le proprie richieste, serve un endpoint scoped-to-owner nuovo, non allargare `requireManagementPermission`.

**`organizer`, `admin` e `super-admin` sono oggi indistinguibili per tutto ciò che passa da `has_management_permissions`.** Quella funzione Postgres è un controllo binario ("è staff o no"), non a livelli — per "Carte Cercate" (l'unico dominio con scritture BFF già costruite) i tre hanno esattamente gli stessi permessi. La distinzione a più livelli di questa matrice riguarda solo le funzionalità **non ancora costruite** (`/associates`, quote, pagamenti eventi, gestione ruoli, mazzi altrui) — è lì che serve il nuovo modello `ROLE_LEVEL`/`can()` di `roles.md`, non `has_management_permissions`. Se in futuro anche le scritture di "Carte Cercate" devono distinguere fra i tre, `has_management_permissions` stessa andrebbe rivista, non solo la UI.

**Mazzi Commander, ora due righe separate** (prima era un'unica riga 🟡 per tutti — corretto 2026-08-10): gestire i **propri** mazzi è 🟢 per chiunque, sempre (stesso `player_own_decks` ownership-check dei backup docs, indipendente dal ruolo); gestire i mazzi **di chiunque altro** è una capacità a parte, riservata ad admin e super-admin.

## Aggiornare questa matrice

Ogni volta che si aggiunge un `Permission` a `PERMISSION_LEVEL` in `app/utils/permissions.ts` (`docs/architecture/roles.md`, §2), aggiungere una riga qui — sono la stessa fonte di verità raccontata in due formati diversi (codice vs. tabella leggibile), non due decisioni separate.
