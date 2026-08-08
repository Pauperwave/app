# PROGRESS — PauperWave Gestionale

<!-- docs/PROGRESS.md -->

Documento vivo per tracciare avanzamento, architettura e decisioni. Aggiornare quando cambiano scope, stack o convenzioni rilevanti.

**Ultimo aggiornamento:** 2026-08-08

---

## Obiettivo del progetto

Gestionale per l'associazione **PauperWave**: organizzazione di tornei multi-formato — non solo Commander, ma anche Premodern, Draft, Pauper, ecc. — gestione tesseramenti/rinnovi, incassi, e creazione/gestione completa dei tornei.

Diverse tabelle nello schema attuale (`mtg_commanders`, `commander_decks`, `tournament_kills`, `tournament_pairings` a 4 posti fissi, `tournament_votes`, la famiglia `rulesets`) incorporano assunzioni specifiche di Commander a livello di schema, non solo di dati — vedi `docs/architecture/database.md` per l'inventario completo tabella-per-tabella. Prima di costruire i flussi Premodern/Draft/Pauper serve una decisione di design su queste tabelle: renderle format-aware, oppure tenerle esplicitamente Commander-only con un percorso parallelo/generico per gli altri formati.

**Integrazione con `MagicTheGathering/league` — imminente, non un obiettivo lontano.** `app` diventerà il progetto unico: il suo backend Supabase (già in costruzione con schema agnostico dal formato, non specifico Commander) e il suo frontend (già più strutturato di quello di league) sono la destinazione finale. `league` verrà assorbito qui, non il contrario — le sue tabelle/meccanismi specifici di Commander (kills, votes, pairing a 4 posti, ruleset) andranno reimplementati in forma agnostica dentro lo schema di `app`. **Scadenza: domenica 30 agosto 2026** — il draft "Lo Hobbit" verrà potenzialmente gestito con questa applicazione, quindi tutto ciò che si costruisce da qui in avanti va fatto pensando all'architettura di destinazione (mutazioni, caching, struttura backend), non con soluzioni provvisorie da rifare al momento dell'integrazione.

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript |
| UI | Nuxt UI (Tailwind-based) |
| Backend/DB | Supabase (Postgres + Auth), Nitro server routes |
| Auth | Supabase magic-link (OTP), sessione via `useSupabaseSession` |

## Decisioni architetturali (ADR)

### ADR-001 — Stato di tesseramento calcolato, non salvato (2026-08-05)

**Contesto:** la colonna `associate_status` esisteva ma era sempre `NULL`; il concetto di "attivo/da rinnovare/scaduto" era pensato a livello di schema (tabella `pauperwave_associate_renewals`, mai popolata) ma mai implementato.

**Decisione:** invece di salvare lo stato come colonna mutabile (rischio concreto di disallineamento, vedi ADR-002 e il bug `membership_request_status`/`request_status` più sotto), lo stato di tesseramento è **calcolato al volo** in una view (`pauperwave_associates_with_status`), confrontando l'ultimo anno di rinnovo con l'anno solare corrente. La colonna `associate_status` è stata droppata.

**Conseguenze:** la sidebar e la colonna "Stato tesseramento" mostrano dati reali invece di badge statici hardcoded; il ciclo di rinnovo è su anno solare (gennaio-dicembre), non per anniversario individuale.

### ADR-002 — `Associate` deriva dallo schema generato, non più a mano (2026-08-05)

**Contesto:** `app/types/index.d.ts` dichiarava `Associate` a mano, con `request_status` invece del vero `membership_request_status` — bug rimasto invisibile a compile-time per mesi.

**Decisione:** `Associate` ora estende `Database['public']['Tables']['pauperwave_associates']['Row']` (generato da `supabase gen types`), con override espliciti solo dove serve una union più stretta (`RequestStatus`, `AssociateType`). Un futuro rename/rimozione di colonna produce un errore di compilazione invece di un bug silenzioso a runtime.

### ADR-003 — Questo DB come base per `MagicTheGathering/league` (2026-08-05, corretto 2026-08-08)

**Contesto:** il DB Supabase di `app` è destinato a diventare la fondazione dell'integrazione con `league`. **Correzione 2026-08-08:** inizialmente descritto come "rebuild futuro di league, progetto sorella già più maturo" — non è così: `league` verrà **assorbito dentro `app`**, non il contrario. `app` ha già lo schema più adatto (agnostico dal formato) e il frontend più strutturato; le tabelle/meccanismi specifici di Commander di league (kills, votes, pairing a 4 posti, ruleset) andranno reimplementati qui in forma generica. Non è un obiettivo lontano: scadenza **domenica 30 agosto 2026** (draft "Lo Hobbit", potenzialmente gestito con questa app — vedi Obiettivo del progetto in cima al documento).

**Decisione:** la correttezza/stabilità dello schema (colonne morte, drift nome-campo tra DB e codice, nullability, policy RLS sovrapposte — vedi `docs/architecture/database.md` e `docs/TODO.md`) ha priorità sui refactor o feature non essenziali, ed entro il 30/08 va valutato esplicitamente cosa di `league` (dati, tabelle, meccanismi Commander-specifici) deve confluire in `app` prima dell'evento.

**Conseguenze:** richieste di refactor "carino ma non necessario" (es. estrarre configurazioni/badge condivisi tra domini non correlati) vengono deliberatamente rimandate — vedi `docs/audits/2026-08-05-fallow-dupes-review.md`. Ogni nuova feature/mutazione va scritta pensando all'architettura di destinazione post-integrazione (vedi ADR-007), non con soluzioni provvisorie.

### ADR-004 — `UTimePicker` custom mantenuto invece di `UInputTime` nativo (2026-08-05)

**Contesto:** Nuxt UI 4.10.0 include nativamente `UInputTime`, un possibile sostituto del componente `app/components/inputs/UTimePicker.vue` scritto a mano (due `USelect` per ore/minuti in un `UPopover`).

**Decisione:** mantenuto il componente custom. Motivo esplicito dell'utente: permette di scegliere liberamente l'intervallo dei minuti (`minuteStep`) con un'interazione a dropdown che preferisce, anche se `UInputTime` espone un prop `step` potenzialmente equivalente.

**Conseguenze:** non riproporre questa sostituzione in futuro a meno che l'utente non la sollevi di nuovo.

### ADR-005 — Ordine colonne tabella "Carte Cercate" (2026-08-07)

**Contesto:** la tabella `wanted-cards` (Giocatore, Data, Stato, Carta, Copie, Lingua, Trattamento, Note) aveva un ordine colonne non deliberato, emerso incrementalmente durante lo sviluppo della feature.

**Decisione:** ordine finale **Giocatore → Carta → Copie → Lingua → Trattamento → Data → Stato → Note**. Logica: leggere le colonne da sinistra a destra come una frase — "[Giocatore] wants [Carta] ×[Copie] in [Lingua], [Trattamento]" — raggruppando gli attributi specifici della richiesta (cosa si cerca) subito dopo il soggetto, prima di passare ai metadati di tracciamento (Data/Stato, che riguardano il ciclo di vita della richiesta, non cosa viene cercato), con Note per ultima in quanto testo libero.

**Conseguenze:** Stato finisce penultima colonna nonostante sia informazione ad alta priorità per la scansione visiva — accettabile perché è già resa come badge colorato, quindi resta scansionabile indipendentemente dalla posizione.

### ADR-006 — `scrollbar-gutter: stable` globale su tutte le `UTable` (2026-08-07)

**Contesto:** nella tabella `wanted-cards`, il bordo destro della tabella si spostava di ~16px (larghezza di una scrollbar classica) a seconda che le righe correnti superassero o meno l'altezza visibile — misurato con `getBoundingClientRect()`: bordo destro a 1676px con 5 righe (nessuna scrollbar), a 1661px con 40+ righe (scrollbar verticale presente). Il margine appariva quindi "incoerente" rispetto alla toolbar filtri sopra, che non si sposta mai. Non è un problema del sidebar (verificato aperto/chiuso: stesso offset in entrambi i casi).

**Decisione:** aggiunta la proprietà CSS `scrollbar-gutter: stable` (via classe arbitraria Tailwind `[scrollbar-gutter:stable]`) allo slot `root` del componente `table` in `app/app.config.ts` (`ui.table.slots.root`), non solo alla singola pagina — così lo spazio della scrollbar è sempre riservato, con o senza overflow verticale, per **ogni** `UTable` dell'app, non solo `wanted-cards`.

**Conseguenze:** tutte le tabelle esistenti e future erediteranno questo comportamento senza bisogno di ripetere l'override per-istanza. Non documentato ufficialmente da Nuxt UI (verificato: nessuna menzione di `scrollbar-gutter` nella doc di `UTable`), ma è una proprietà CSS standard e non in conflitto con nessun pattern ufficiale (sticky header, virtualizzazione, altezza fissa) menzionato nella doc.

### ADR-007 — Allineamento ai meccanismi di `league` (2026-08-08, corretto 2026-08-08)

**Contesto:** l'integrazione con `MagicTheGathering/league` è imminente (scadenza 30/08/2026, vedi ADR-003 corretto), non un obiettivo lontano. League ha un'architettura più matura per la gestione dello stato: store Pinia con la regola esplicita "mutazione ottimistica in memoria dopo una scrittura riuscita, mai un refetch completo" (`app/stores/CLAUDE.md` in league), e per i domini CRUD più recenti è migrata a Pinia Colada (query/mutation composables con invalidazione automatica) più un layer BFF (ADR-015 di league). Qui invece si usano composables "nudi" (`useAsyncData` + `useSupabaseClient`), senza state library — vedi il bug di `wanted-cards`: `setStatus` chiamava `refresh()` su un `useAsyncData`, il che faceva ripartire `pending` e smontava/rimontava l'intera tabella/griglia (`v-if="loading"`) per un semplice cambio di stato.

**Correzione 2026-08-08:** la prima stesura di questo ADR concludeva "non introdurre Pinia/Pinia Colada/BFF preventivamente, è YAGNI per un merge senza data" — conclusione basata su un'assunzione sbagliata sui tempi. Con l'integrazione a 23 giorni e un evento reale (draft "Lo Hobbit") potenzialmente gestito da questa app, l'indicazione esplicita dell'utente è opposta: non costruire soluzioni provvisorie da riscrivere al momento dell'adozione — le nuove feature vanno scritte fin da subito pensando all'architettura di destinazione.

**Decisione (confermata dall'utente 2026-08-08):** introdurre Pinia/Pinia Colada **e il layer BFF** in `app` da subito (non solo le letture), replicando esattamente il pattern di `league`: composable `use<Dominio>Query.ts` (`useQuery`, legge Supabase direttamente col client anon) + `use<Dominio>Mutations.ts` (`useMutation`, chiama un endpoint `server/api/<dominio>/*.post.ts` via `$fetch`, mai Supabase diretto dal client) + endpoint BFF con `serverSupabaseServiceRole` come unico boundary di autorizzazione, `onSettled: invalidateQueries` per invalidare la cache dopo ogni scrittura.

**Fatto (2026-08-08):** dominio `wanted-cards` migrato per intero come primo caso pilota:
- Dipendenze aggiunte: `pinia@4.0.2`, `@pinia/nuxt@1.0.1`, `@pinia/colada@1.4.2`, `@pinia/colada-nuxt@1.0.2`, `@pinia/colada-plugin-cache-persister@1.1.0`; moduli registrati in `nuxt.config.ts` (`@pinia/nuxt` prima di `@nuxtjs/supabase`, `@pinia/colada-nuxt` per ultimo); `colada.options.ts` in root con il cache persister (chiave `pauperwave-colada-cache`).
- `app/composables/useWantedCardsQuery.ts` (query) + `app/composables/useWantedCardsMutations.ts` (mutation) sostituiscono il vecchio `useWantedCards.ts` (rimosso).
- Nuovi endpoint `server/api/wanted-cards/{create,[id]/update,[id]/status,[id]/delete}.post.ts`, tutti con `serverSupabaseServiceRole`; `create` richiede solo utente autenticato (`requireUser`), gli altri tre richiedono permessi di gestione (`requireManagementPermission`) — replica la stessa distinzione che prima viveva nelle policy RLS, ora enforced nell'endpoint.
- Nuovo `server/utils/serverAuth.ts` (`requireUser`, `requireManagementPermission` via RPC `has_management_permissions`) e `app/utils/error.ts` (`toErrorMessage`, `isConflictError`, copiati da league).
- **Insidia trovata e risolta:** `serverSupabaseUser(event)` di `@nuxtjs/supabase` 2.0.9 restituisce il `JwtPayload` decodificato, non lo user Supabase completo — l'id utente è nel claim standard JWT `sub`, non in `.id` (che è `undefined`). Passare `{ p_user_id: undefined }` a `supabase.rpc()` fa sì che supabase-js scarti la chiave, risultando in una chiamata RPC senza argomenti e nell'errore fuorviante "could not find function ... without parameters". Sintomo osservato in test manuale nel browser (toast d'errore su un cambio di stato), non dal typecheck (l'errore è runtime, non di tipo).
- Il bug originale di `setStatus` (refresh completo → smontaggio tabella/griglia) è risolto "gratuitamente" dal nuovo meccanismo: Colada distingue `isLoading` (solo primo caricamento) da un refetch in background dopo `invalidateQueries` — la UI non si smonta più durante gli aggiornamenti, senza bisogno della patch ottimistica manuale scritta in precedenza.
- Verificato end-to-end nel browser (cambio stato "In cerca" → "Trovata" → "In cerca" tramite endpoint reale, nessun errore in console, nessun flash della griglia); lint e typecheck puliti.

**Da fare (non ancora nello scope completato):** migrare gli altri composables (`useAssociates`, `useAssociateGeocodes`) allo stesso pattern — vedi `docs/BACKLOG.md`.

**Conseguenze:** ogni composable di dominio esistente va riscritto sotto questo pattern invece che `useAsyncData` nudo, replicando lo schema di `wanted-cards` come riferimento concreto.

## Vedi anche

- `docs/architecture/database.md` — schema, RLS, migrazioni
- `docs/BACKLOG.md` / `docs/TODO.md` — lavoro pianificato e osservazioni aperte
