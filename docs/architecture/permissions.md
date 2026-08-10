# Permissions matrix

<!-- docs/architecture/permissions.md -->

Human-readable companion to `docs/architecture/roles.md` — that doc has the implementation (`ROLE_LEVEL`/`PERMISSION_LEVEL`, `can()`, the middleware/plugin plan); this one is the reference table for "who can do what," at a coarser grain than a boolean. Written 2026-08-10, alongside the associate/player/`app_role` distinction in `docs/architecture/database.md`.

## Legend

- 🟢 Accesso completo
- 🟡 Accesso parziale — solo i propri dati/azioni, non quelli altrui
- 🔴 Nessun accesso

🟡 rows are not expressible as a single `can()` boolean — they need the data itself scoped to the logged-in user (a `WHERE` clause or an RLS policy keyed on `auth.uid()`), not just a route/button gate. See `docs/architecture/roles.md`'s "Goal" section: this is exactly the "different **content**, not just different **permissions**" case.

## Matrix

| Funzionalità | player | organizer | admin |
|---|:---:|:---:|:---:|
| Visualizzare classifiche (Cittadino, Commander, Premodern, Pauper) | 🟢 | 🟢 | 🟢 |
| Visualizzare tornei, leghe, eventi | 🟢 | 🟢 | 🟢 |
| Iscriversi a un torneo/evento | 🟡 (solo per sé stesso) | 🟢 | 🟢 |
| Creare, modificare, eliminare tornei/leghe/eventi | 🔴 | 🟢 | 🟢 |
| Visualizzare "Carte Cercate" | 🟢 | 🟢 | 🟢 |
| Creare una richiesta "Carta Cercata" | 🟡 (solo per sé stesso) | 🟢 | 🟢 |
| Modificare/eliminare/cambiare stato di una richiesta altrui | 🔴 | 🟢 | 🟢 |
| Gestire i propri mazzi Commander | 🟡 (solo i propri) | 🟡 (solo i propri) | 🟡 (solo i propri) |
| Visualizzare il proprio stato di tesseramento/dati anagrafici | 🟡 (solo il proprio) | 🟡 (solo il proprio) | 🟢 (tutti i soci) |
| Gestire l'anagrafica soci (`/associates`) | 🔴 | 🔴 | 🟢 |
| Gestire pagamenti/quote associative | 🔴 | 🔴 | 🟢 |
| Assegnare/modificare ruoli (`/settings/members`) | 🔴 | 🔴 | 🟢 |

## Note

**"Carte Cercate" oggi è già così, verificato nel codice — non è un piano futuro.** `server/api/wanted-cards/create.post.ts` usa solo `requireUser` (chiunque loggato crea la propria richiesta); `[id]/{delete,update,status,refresh-prices}.post.ts` usano tutti `requireManagementPermission` — persino segnare una propria richiesta come "trovata" richiede oggi un ruolo di gestione, non solo essere il richiedente. Se in futuro un player deve poter gestire (non solo creare) le proprie richieste, serve un endpoint scoped-to-owner nuovo, non allargare `requireManagementPermission`.

**`organizer` e `admin` sono oggi indistinguibili per tutto ciò che passa da `has_management_permissions`.** Quella funzione Postgres è un controllo binario ("è staff o no"), non a livelli — per "Carte Cercate" (l'unico dominio con scritture BFF già costruite) un organizer ha esattamente gli stessi permessi di un admin. La distinzione a tre livelli di questa matrice (righe con `organizer` 🟢 ma `admin` unico che sale oltre) riguarda solo le funzionalità **non ancora costruite** (`/associates`, pagamenti, gestione ruoli) — è lì che serve il nuovo modello `ROLE_LEVEL`/`can()` di `roles.md`, non `has_management_permissions`. Se in futuro anche le scritture di "Carte Cercate" devono distinguere organizer da admin, `has_management_permissions` stessa andrebbe rivista, non solo la UI.

**Righe 🟡 con "solo i propri mazzi" per tutti i ruoli**: intenzionale, non un errore di copia — i backup docs (`3-RLS-policies.md`, tabella `player_decks`) propongono `player_own_decks` come ownership-check indipendente dal ruolo (chiunque gestisce solo i propri mazzi, staff inclusi), più `management_full_access` come override per lo staff. Se lo staff deve poter gestire i mazzi di chiunque (non verificato), la colonna admin/organizer diventerebbe 🟢.

## Aggiornare questa matrice

Ogni volta che si aggiunge un `Permission` a `PERMISSION_LEVEL` in `app/utils/permissions.ts` (`docs/architecture/roles.md`, §2), aggiungere una riga qui — sono la stessa fonte di verità raccontata in due formati diversi (codice vs. tabella leggibile), non due decisioni separate.
