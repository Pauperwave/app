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

Ordinata per permessi crescenti — dall'alto (accessibile a `player`) verso il basso (`super_admin` soltanto), riordinata 2026-08-10.

| Funzionalità | player | organizer | admin | super-admin |
|---|:---:|:---:|:---:|:---:|
| Visualizzare classifiche (Cittadino, Commander, Premodern, Pauper) | 🟢 | 🟢 | 🟢 | 🟢 |
| Visualizzare tornei, leghe, eventi | 🟢 | 🟢 | 🟢 | 🟢 |
| Iscriversi a un torneo/evento | 🟡 (solo per sé stesso) | 🟢 | 🟢 | 🟢 |
| Visualizzare "Carte Cercate" | 🟢 | 🟢 | 🟢 | 🟢 |
| Creare una richiesta "Carta Cercata" | 🟡 (solo per sé stesso) | 🟢 | 🟢 | 🟢 |
| Cambiare stato (trovata/abbandonata) della propria richiesta | 🟡 (solo la propria) | 🟢 | 🟢 | 🟢 |
| Gestire i propri mazzi Commander | 🟢 | 🟢 | 🟢 | 🟢 |
| Visualizzare il proprio stato di tesseramento/dati anagrafici | 🟡 (solo il proprio) | 🟢 (tutti i soci) | 🟢 (tutti i soci) | 🟢 (tutti i soci) |
| Creare, modificare tornei/leghe/eventi (inclusa la gestione ordinaria dei round) | 🔴 | 🟢 | 🟢 | 🟢 |
| Correggere/azzerare i dati di un singolo tavolo/pairing | 🔴 | 🟢 | 🟢 | 🟢 |
| Gestire pagamenti di eventi/tornei | 🔴 | 🟢 | 🟢 | 🟢 |
| Eliminare la propria richiesta | 🔴 | 🟢 | 🟢 | 🟢 |
| Modificare/eliminare/cambiare stato di una richiesta altrui | 🔴 | 🟢 | 🟢 | 🟢 |
| Inviare email di ricevuta (quote eventi/tornei, quote associative) | 🔴 | 🔴 | 🟢 | 🟢 |
| Gestire i mazzi Commander di tutti i giocatori | 🔴 | 🔴 | 🟢 | 🟢 |
| Gestire l'anagrafica soci (`/associates`) | 🔴 | 🔴 | 🟢 | 🟢 |
| Gestire le quote associative | 🔴 | 🔴 | 🟢 | 🟢 |
| **Annullare un round** (incl. riportare l'intero torneo in registrazione) | 🔴 | 🔴 | 🔴 | 🟢 |
| **Eliminare** un mazzo Commander altrui | 🔴 | 🔴 | 🔴 | 🟢 |
| **Eliminare** un regolamento (ruleset) | 🔴 | 🔴 | 🔴 | 🟢 |
| **Eliminare definitivamente** tornei/leghe/eventi | 🔴 | 🔴 | 🔴 | 🟢 |
| **Eliminare definitivamente** una riga da `/trash` (`purge-trash`), incl. configurarne la conservazione in `/settings` | 🔴 | 🔴 | 🔴 | 🟢 |
| Assegnare/modificare ruoli (`/settings/members`) | 🔴 | 🔴 | 🔴 | 🟢 |

## Navigazione (visibilità pagina, non azione)

Righe aggiunte 2026-08-17 mentre si decideva quali voci della sidebar (`app/composables/layout/useMainNavGroups.ts`) nascondere per `player`, step 12/13 di `docs/architecture/roles.md`. Distinte dalla tabella sopra: qui il permesso decide solo se la *pagina* compare in navigazione, non cosa ci si può fare una volta dentro — es. `/associates` è visibile a `organizer` (vede tutti i soci, riga sopra), ma modificare/eliminare un socio resta `manage-members` (`admin`, riga sopra).

| Pagina | player | organizer | admin | super-admin |
|---|:---:|:---:|:---:|:---:|
| `/associates`, `/associates/requests` (`view-associates`) | 🔴 | 🟢 | 🟢 | 🟢 |
| `/finance`, `/transactions` (`view-finance`) | 🔴 | 🟢 | 🟢 | 🟢 |
| `/players` (`view-players`) | 🔴 | 🟢 | 🟢 | 🟢 |
| `/locations` (`manage-locations`) | 🔴 | 🟢 | 🟢 | 🟢 |
| `/rulesets` (`manage-rulesets`) | 🔴 | 🟢 | 🟢 | 🟢 |
| `/settings`, `/settings/members`, `/settings/permissions`, `/settings/domains`, `/settings/notifications` (`access-settings`) | 🔴 | 🔴 | 🟢 | 🟢 |
| `/trash` — vedere le righe soft-eliminate e ripristinarle (`view-trash`) | 🔴 | 🔴 | 🟢 | 🟢 |

Non gated (visibili a tutti, incluso `player`): dashboard, calendario, `/tournaments`/`/leagues`/`/events`, `/wanted-cards`, `/standings/*`, `/statistics/*` — stessa logica della riga "Visualizzare tornei, leghe, eventi" sopra (🟢 ovunque): le azioni di scrittura restano gated separatamente, la pagina in sola lettura resta pubblica.

**Revisionato 2026-08-17: l'intera sezione `/settings` è admin+, non più organizer per `/settings`/`/settings/permissions`.** Trovato mentre si verificava questa tabella: `settings.vue` ha una sua seconda barra di navigazione interna (i tab sopra il corpo della pagina), completamente separata da `useMainNavGroups.ts` e non filtrata da nessun permesso — un organizer poteva raggiungere `/settings/members`/`/settings/domains` cliccando quei tab anche con la voce nascosta in sidebar, perché **nessuna pagina sotto `/settings` dichiarava `definePageMeta({ permission })`**: nascondere il link in sidebar non bastava, mancava l'enforcement lato route in `authorization.global.ts`. Corretto uniformando tutte e cinque le pagine (incluso `/settings/notifications`, raggiungibile solo via URL diretto, mai linkata da nessuna delle due barre) su un unico permesso `access-settings: admin`, sia nel tab bar di `settings.vue` sia via `definePageMeta` su ciascuna pagina figlia. `manage-roles` (`super_admin`) resta invariato per l'azione di assegnazione ruolo vera e propria — invariato lato RPC (`assign_role`), non più usato per il gate della pagina.

## Note

**Corretto 2026-08-17: "Visualizzare... dati anagrafici" è 🟢 per `organizer`, non 🟡.** Errore nella revisione 2026-08-10 — un organizer deve poter vedere l'anagrafica di *tutti* i soci (non solo la propria), distinto dalla riga "Gestire l'anagrafica soci (/associates)" qui sotto, che resta `admin`-only: `organizer` vede tutti i soci ma non modifica/elimina i loro dati. Corretto mentre si decideva il gate di navigazione per `/associates` — la vecchia riga avrebbe reso quella pagina erroneamente inaccessibile a un organizer.

**"Carte Cercate" oggi *non* rispetta ancora questa matrice — deciso 2026-08-10, da correggere nel codice.** `server/api/wanted-cards/create.post.ts` usa solo `requireUser` (corretto, chiunque loggato crea la propria richiesta); ma `[id]/status.post.ts` usa oggi `requireManagementPermission`, quindi anche segnare una **propria** richiesta come "trovata"/"abbandonata" richiede un ruolo di gestione — comportamento sbagliato, confermato dall'utente. Un giocatore deve avere pieno controllo sullo stato delle proprie richieste; l'unica cosa che deve restare riservata alla gestione è l'**eliminazione** della richiesta (`[id]/delete.post.ts`, invariato). Il fix è in `server/api/wanted-cards/[id]/status.post.ts`: accettare anche il creatore della richiesta (owner-check sul `player_associate_uuid`/creator, come `player_own_registration` nei backup docs), non solo `requireManagementPermission` — vedi `docs/BACKLOG.md` P2. `[id]/update.post.ts` e `[id]/refresh-prices.post.ts` non sono stati toccati da questa decisione, restano `requireManagementPermission`.

**Inviare ricevute è separato da "gestire pagamenti," confermato 2026-08-10.** Un organizer registra/gestisce i pagamenti di eventi e tornei (già in matrice), ma l'invio della ricevuta via email — sia per quote eventi/tornei sia per quote associative — sale ad `admin`. Comunicazione ufficiale verso soci/partecipanti trattata più cautamente della semplice registrazione interna del pagamento.

**"Annullare un round" è un'eccezione ritagliata dalla gestione ordinaria dei tornei, confermata 2026-08-10.** Un organizer gestisce un torneo dall'inizio alla fine — inclusi i round, normalmente — ma annullare un round già avviato è trattato come l'eliminazione definitiva: un'azione distruttiva/irreversibile che va oltre l'amministrazione ordinaria, riservata a `super_admin` anche se il torneo nel suo complesso resta gestibile da `organizer`.

**Righe aggiunte 2026-08-10 esaminando il progetto gemello `MagicTheGathering/league`** (nessun sistema di ruoli per utente lì — solo una password condivisa — quindi niente da riusare su *chi* può fare cosa, solo sulle azioni distruttive che esistono nel dominio):
- `league` ha un endpoint "torna indietro di un round" che, dal round 1, riporta l'intero torneo in fase di registrazione cancellando pairing/standings — trattato come la stessa azione di "annullare un round" sopra, non una riga a parte.
- Il reset di un **singolo tavolo/pairing** (corregge un errore di inserimento — uccisioni, posizione, comandante, voti) è invece trattato come correzione operativa di routine, non come azione distruttiva grave: `organizer`, non `super_admin`.
- Eliminare un mazzo Commander altrui e eliminare un regolamento (ruleset) sono entrambe azioni di cancellazione definitiva, quindi `super_admin` — distinte dalla semplice **gestione** dei mazzi altrui (`admin`, riga sopra).

**"Eliminare definitivamente" non si applica ai soci.** A differenza di tornei/leghe/eventi, un associato oggi non viene mai cancellato per davvero — lo stato di tesseramento è calcolato dal confronto fra l'ultimo `renewal_year` in `pauperwave_associate_renewals` e l'anno corrente (`docs/architecture/database.md`, "Membership status model"): un socio non rinnovato resta visibile con l'ultima data di rinnovo nota, non sparisce. Non serve quindi un permesso "elimina socio" riservato a super_admin — la gestione anagrafica di `admin` è già sufficiente. Soft-delete vero e proprio (per tornei/leghe/eventi, o altrove) è pianificato ma non ancora scoped — quando arriva, va deciso se "eliminazione definitiva" resta super_admin-only anche con un soft-delete di mezzo, o se il soft-delete stesso diventa disponibile ad `admin` e solo la purga fisica resta a `super_admin`.

**Risolto anche lato audit trail, 2026-08-23:** `deleted_by` (colonna dedicata, non `updated_by` riciclato — vedi ADR-027 in `docs/PROGRESS.md`) è stata aggiunta a tutte e 7 le tabelle soft-eliminabili, popolata da `softDeleteById` e ripulita da `restoreById`. Non è un permesso a sé — usa lo stesso `resolveAuditAssociateUuid` di `created_by`/`updated_by`, quindi nessuna riga in questa matrice cambia.

**Risolto 2026-08-22/23 con `/trash` (`view-trash` ad `admin`, `purge-trash` a `super_admin`):** l'atto di soft-eliminare una riga (i sei bottoni "elimina" già esistenti) resta invariato a `manage-tournaments`/organizer+ (`requireManagementPermission`) — non toccato da questa feature. Ripristinare una riga soft-eliminata è una capacità introdotta ad `admin` (`requireAdminPermission`, `server/api/trash/restore.post.ts`) anziché allo stesso livello organizer del delete che la genera — coerente con "annullare un'azione distruttiva è più delicato del compierla" già applicato altrove in questa matrice (es. "Annullare un round"). La purga fisica (eliminazione definitiva riga da riga, `server/api/trash/purge.post.ts`) è stata aggiunta il 2026-08-23 un livello sopra, a `super_admin` (`requireSuperAdminPermission`, nuovo helper in `server/utils/serverAuth.ts`) — coerente con la riga "Eliminare definitivamente" già `super_admin`-only per tornei/leghe/eventi. Un job `pg_cron` (`purge_expired_trash()`, migrazione `20260823120000`) applica la stessa purga automaticamente dopo `pauperwave_settings.trash_retention_days` giorni (60 di default, configurabile da `/settings` dietro lo stesso permesso `purge-trash`) — vedi ADR-028 in `docs/PROGRESS.md`.

**`organizer`, `admin` e `super-admin` sono oggi indistinguibili per tutto ciò che passa da `has_management_permissions`.** Quella funzione Postgres è un controllo binario ("è staff o no"), non a livelli — per "Carte Cercate" (l'unico dominio con scritture BFF già costruite) i tre hanno esattamente gli stessi permessi. La distinzione a più livelli di questa matrice riguarda solo le funzionalità **non ancora costruite** (`/associates`, quote, pagamenti eventi, gestione ruoli, mazzi altrui, eliminazione definitiva) — è lì che serve il nuovo modello `ROLE_LEVEL`/`can()` di `roles.md`, non `has_management_permissions`. Se in futuro anche le scritture di "Carte Cercate" devono distinguere fra i tre, `has_management_permissions` stessa andrebbe rivista, non solo la UI.

**Mazzi Commander, ora due righe separate** (prima era un'unica riga 🟡 per tutti — corretto 2026-08-10): gestire i **propri** mazzi è 🟢 per chiunque, sempre (stesso `player_own_decks` ownership-check dei backup docs, indipendente dal ruolo); gestire i mazzi **di chiunque altro** è una capacità a parte, riservata ad admin e super-admin.

## Aggiornare questa matrice

Ogni volta che si aggiunge un `Permission` a `PERMISSION_LEVEL` in `app/utils/permissions.ts` (`docs/architecture/roles.md`, §2), aggiungere una riga qui — sono la stessa fonte di verità raccontata in due formati diversi (codice vs. tabella leggibile), non due decisioni separate.
