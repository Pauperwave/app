# PROGRESS — PauperWave Gestionale

<!-- docs/PROGRESS.md -->

Documento vivo per tracciare avanzamento, architettura e decisioni. Aggiornare quando cambiano scope, stack o convenzioni rilevanti.

**Ultimo aggiornamento:** 2026-08-11

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

### ADR-008 — `created_by`/`updated_by` popolati via helper server generico, non trigger `auth.uid()` (2026-08-08)

**Contesto:** `created_by`/`updated_by` esistono su 6 tabelle (`pauperwave_associates`, `pauperwave_wanted_cards`, `pauperwave_associate_geocodes`, `pauperwave_associate_renewals`, `pauperwave_payments`, `user_roles`), tutte con FK verso `auth.users(id)`, ma **non erano mai popolate** — nessun trigger DB, nessun endpoint le scriveva (le uniche occorrenze in `server/` erano stringhe `'admin'` hardcoded in endpoint ancora mock). Un trigger DB classico basato su `auth.uid()` non funzionerebbe comunque: le scritture passano dal layer BFF con service-role key (ADR-007), che bypassa RLS e non ha sessione — `auth.uid()` è sempre `null` in quel contesto, l'endpoint stesso è il boundary di autorizzazione, non una policy/trigger.

**Decisione:** popolare `created_by`/`updated_by` esplicitamente negli endpoint BFF tramite un helper server condiviso e generico (`server/utils/auditColumns.ts`: `auditColumnsForInsert`/`auditColumnsForUpdate`), riusabile as-is dalle altre tabelle. Per `pauperwave_wanted_cards`, retarget della FK da `auth.users(id)` a `pauperwave_associates(uuid)` (stesso pattern di `player_associate_uuid`): l'helper risolve l'associato dell'utente autenticato via email match (stessa logica usata client-side per "Le mie richieste"), così mostrare "chi" in UI è un join diretto, mai una chiamata all'admin API di Supabase per risolvere un id utente auth a un nome. Aggiunto anche un trigger generico `public.set_updated_at()` (nessuna dipendenza da `auth.uid()`) come rete di sicurezza per `updated_at`, per scritture future fuori dal BFF.

**Conseguenze:** con più FK dalla stessa tabella verso `pauperwave_associates` (`player_associate_uuid`, `created_by`, `updated_by`), PostgREST non distingue più da solo quale relazione usare per un embed — le query che fanno join su `pauperwave_associates` vanno annotate con l'hint di colonna (`pauperwave_associates!player_associate_uuid(...)`), altrimenti falliscono con "more than one relationship was found". Le altre 5 tabelle restano da migrare allo stesso pattern (`docs/BACKLOG.md`) — decisione sulla FK (`auth.users` vs `pauperwave_associates`) da prendere per tabella in base a se/come il dato va mostrato in UI, non un cambio schema-wide.

### ADR-009 — Query Pinia Colada persistite di default via `PiniaColadaCachePersister` (2026-08-08)

**Contesto:** `@pinia/colada-plugin-cache-persister` era già una dipendenza del progetto e già registrato globalmente in `colada.options.ts` (nessun `filter`, quindi si applica a ogni `useQuery`), ma finora solo `WANTED_CARDS_KEY` (`useWantedCardsQuery.ts`) passava da `useQuery`. Il primo caso pratico che ha reso visibile il vantaggio: la ricerca stampe Scryfall in `AddModal.vue` (edizione di una carta) rifaceva la chiamata `/cards/search` — e ripartiva da zero il precaricamento immagini — ogni volta che l'utente tornava su un nome carta già cercato, anche nella stessa sessione. Convertendo `useScryfallCardSearch.ts` da `$fetch` diretto a `useQuery` (chiave `['scryfall-printings', cardName]`), il risultato resta in cache RAM per la sessione e viene persistito su `localStorage` dal plugin già attivo, senza alcuna configurazione aggiuntiva.

**Decisione:** ogni nuovo dato letto via `useQuery` (Pinia Colada) eredita la persistenza da `colada.options.ts` per costruzione — non serve fare nulla di apposito per attivarla, va solo evitato di aggirarla tornando a un `$fetch`/`useAsyncData` ad-hoc quando i dati si prestano a essere cache-abili (risposte di API esterne o Supabase che non cambiano ad ogni richiesta). Quando una query non deve persistere (dati sensibili, o che devono sempre essere freschi), va esclusa esplicitamente con l'opzione `filter` del plugin in `colada.options.ts`, non aggirata caso per caso nel composable.

**Conseguenze:** rafforza ADR-007 — la migrazione dei composables non ancora convertiti (`useAssociates`, `useAssociateGeocodes`, vedi `docs/BACKLOG.md`) a `useQuery` porta anche questo beneficio "gratis", non solo l'allineamento a `league`. Va tenuto a mente il rovescio della medaglia: dati ora persistiti su `localStorage` possono restare visibili (stale) tra un deploy e l'altro finché la chiave o la struttura dei dati non cambia — nessun problema riscontrato finora, ma da verificare se in futuro si introducono breaking change sulla shape di una query già cacheata.

### ADR-010 — `changelogen` per version bump automatico + indice grezzo separato dal changelog curato (2026-08-08)

**Contesto:** il progetto non aveva un campo `version` in `package.json` né un meccanismo di bump prima dell'introduzione del version badge in sidebar (che legge `appVersion`/`appEnv` da `runtimeConfig`, ADR n/a — vedi commit relativo). I commit seguono già conventional commits con scope (`type(scope): 🚀 descrizione`, gitmoji manuale nella subject). `docs/CHANGELOG.md` è mantenuto a mano, raggruppato per data, con bullet "cosa/perché" scritti con l'aiuto di Claude — ma questo significa trascrivere ogni commit a mano, col rischio di perdere quelli meccanici (`style`, `chore`, refactor banali) o di disallinearsi dalla cronologia git reale (già successo: il file era indietro di 3 giorni di commit).

**Decisione:** adottato [`changelogen`](https://github.com/unjs/changelogen) (unjs) con due usi distinti, non sovrapposti:
1. **Bump automatico** — `changelogen --bump`/`--release` aggiorna `package.json` (e tag git per `--release`) leggendo i `type(scope):` esistenti, nessun cambio alle abitudini di commit. Mapping di default: `feat` → minor, `fix`/`refactor`/`perf`/`docs`/`build`/`types` → patch, `chore`/`style`/`test`/`ci` → nessun bump, `BREAKING CHANGE`/`!` → major.
2. **Indice grezzo completo** — `CHANGELOG.md` generato alla **root** del progetto (non `docs/`), `emoji: false` nel titolo delle sezioni (l'emoji scritta a mano nel commit resta comunque, changelogen non la tocca). Copre *ogni* commit raggruppato per tipo, rigenerato ad ogni release — non va editato a mano.

Di conseguenza `docs/CHANGELOG.md` (curato) si alleggerisce: non deve più trascrivere ogni commit — quello lo copre il file root generato — ma solo le voci con un "perché" che vale la pena raccontare (feature nuove, bugfix non ovvi, decisioni architetturali, spesso con link a un ADR qui in `PROGRESS.md`).

**Conseguenze:** due file chiamati "changelog" nello stesso repo ma con nome/posizione diversi (`CHANGELOG.md` root = auto, `docs/CHANGELOG.md` = curato) — chi legge la doc taxonomy in `docs/README.md` va aggiornato per chiarire la distinzione. Il file root generato non va mai editato a mano (si perde al prossimo `--release`); se in futuro serve un dettaglio "perché" per un commit già rilasciato, va scritto in `docs/CHANGELOG.md`, non nel file generato.

### ADR-011 — Sottodomini pubblici serviti dallo stesso progetto Nuxt (2026-08-09)

**Contesto:** `pauperwave.org` è stato acquistato il 2026-08-08. Due esigenze pubbliche distinte sono emerse quasi subito: la classifica del Campionato Cittadino (sola lettura, oggi pubblicata a mano in bacheca ogni mese, vedi `docs/BACKLOG.md` P1) e un modulo di adesione che permetta a chi vuole associarsi di far arrivare i propri dati direttamente nel DB, senza trascrizione manuale. Oggi le uniche rotte non autenticate sono `/login`, `/auth/callback` e `/logout`, e l'app contiene dati personali di associati — codici fiscali, indirizzi di residenza, date di nascita.

**Decisione:** un solo progetto Nuxt, più sottodomini che puntano allo stesso deploy, invece di build separate. La scelta è motivata dal fatto che il modulo di adesione deve comunque **scrivere** sul DB — un deploy separato dovrebbe replicare la validazione e gli endpoint BFF, che già esistono qui.

Mappa decisa il 2026-08-09, **corretta il 2026-08-10** sulla colonna Auth delle classifiche (vedi nota sotto), **e di nuovo il 2026-08-13** (vedi seconda correzione):

| Sottodominio | Scopo | Auth |
|---|---|---|
| `app.pauperwave.org` | il gestionale, cioè questa applicazione | sì |
| `cittadino.pauperwave.org` | classifica del Campionato Cittadino, sola lettura | no |
| `commander.pauperwave.org` | classifica Commander, sola lettura | no |
| `premodern.pauperwave.org` | classifica Premodern, sola lettura | no |
| `pauper.pauperwave.org` | classifica Pauper, sola lettura | no |
| `eventi.pauperwave.org` | calendario eventi pubblico, con ICS scaricabile (`docs/TODO.md`) | no |
| `tesseramento.pauperwave.org` | modulo di adesione, scrive nel DB | no |
| `blog.pauperwave.org` | blog dell'associazione | no |
| `league.pauperwave.org` | benchmark **temporaneo** per le leghe Commander (`MagicTheGathering/league`), da dismettere a migrazione completata | — |

Sul nome del sottodominio di adesione: la prima idea era `associati.`, imperativo ("associati a PauperWave!"). Scartata proprio perché la rotta interna `/associates` ha breadcrumb "Associati" ed è il registro **privato** dei soci già tesserati — stessa parola, significato opposto, con il rischio concreto che qualcuno punti il sottodominio pubblico alla pagina sbagliata. `tesseramento` è invece il termine che l'app già usa per questo concetto (`membershipStatus` → "Stato tesseramento", `pauperwave_associate_number` → "no. tessera") e non collide con nulla. Scartata anche `iscriviti.`, che avrebbe spostato l'ambiguità altrove: nell'app "Iscritti" e "quota di iscrizione" riguardano l'iscrizione **a un torneo**.

**Correzione 2026-08-10 — le classifiche non sono "pubbliche" in senso stretto, restano dietro il magic-link esistente.** Le classifiche mostrano nome e cognome dei soci, dato personale ma non di categoria particolare (art. 9 GDPR) — pubblicarlo a chiunque, senza login, rientrerebbe nel consenso "Diffusione di immagini" dell'informativa soci, che è **facoltativo e non universale** (non tutti i soci lo danno). La stessa informativa autorizza però la comunicazione dei dati **agli altri soci** per l'organizzazione delle attività, già coperta dal consenso obbligatorio all'adesione — quindi una classifica visibile solo a chi ha fatto login (stesso magic-link OTP di `app.pauperwave.org`, non una utenza condivisa) è coperta senza bisogno di raccogliere altro. `eventi.` e `tesseramento.` restano genuinamente pubbliche perché devono per forza raggiungere chi socio non è ancora.

**Correzione 2026-08-13 — la correzione del 2026-08-10 è superata: le quattro classifiche tornano pubbliche, senza login.** Costruite come pagine standalone (`app/pages/(public)/rankings/<format>/index.vue`, layout `public-wide.vue`, componenti `StandingsPublicFormatPage.vue`/`StandingsPublicCittadinoPage.vue`) distinte dalle rotte interne `/standings/<format>` che restano dietro login per lo staff — vedi `app/middleware/auth.global.ts` e l'`exclude` di `@nuxtjs/supabase` in `nuxt.config.ts`, entrambi aggiornati per includere `/rankings/*`. Decisione confermata esplicitamente dall'utente il 2026-08-13 nonostante il conflitto con il ragionamento GDPR del 2026-08-10 (consenso "Diffusione di immagini" facoltativo e non universale) — **quel ragionamento non è stato invalidato**, solo scavalcato da una decisione di prodotto più recente. Se il vincolo di consenso è ancora valido, resta un rischio di conformità aperto su questa scelta; non verificato in questa sessione.

Vincolo che rende accettabile la parte **davvero** pubblica (`eventi.`, `tesseramento.`, `blog.`): **i dati pubblici passano solo attraverso viste dedicate, mai attraverso le tabelle**. Nessuna policy `anon` va aggiunta a `pauperwave_associates`, `players` o `tournament_standings`; si crea invece una vista che espone il minimo indispensabile. Le classifiche, essendo dietro login, non hanno bisogno di questo vincolo — leggono già con l'utente autenticato come ogni altra pagina del gestionale.

**Conseguenze (superate dalla correzione 2026-08-13 sopra):** ~~essendo dietro login, le classifiche **non** vanno aggiunte a `publicPages` in `app/middleware/auth.global.ts` né a `redirectOptions`/`exclude` di `@nuxtjs/supabase` in `nuxt.config.ts`~~ — ora **sono** state aggiunte a entrambe le liste, insieme a `eventi.` e `tesseramento.`, dato che `/rankings/*` è tornato pubblico. Rafforza comunque la P1 di `docs/BACKLOG.md` sulla policy catch-all troppo permissiva di `pauperwave_associates`: finché quella resta, va chiusa **prima** di pubblicare `eventi.`, `tesseramento.` o `rankings.`, che ora sono tutte rotte che servono traffico anonimo dallo stesso deploy.

Direzione registrata, implementazione **non** decisa: un sottodominio per formato non può nascere da solo, servirebbe **DNS wildcard** (`*.pauperwave.org`) più una rotta che risolve il formato dall'hostname, altrimenti ogni nuovo formato richiede un record DNS a mano. L'alternativa è tenerli come percorsi sotto `cittadino.` (`cittadino.pauperwave.org/pauper`), che è automatico davvero e non costa nulla in configurazione. Non va costruito ora: il filtro per formato su `/cittadino` (2026-08-09) già ricalcola la classifica sul sottoinsieme selezionato, quindi il motore c'è — manca solo di decidere se merita una superficie propria. Vale anche qui la cautela già applicata alla sezione "Commander" della sidebar (`docs/TODO.md`): `mtg_formats` ha 0 righe, nessun formato è ancora un dato.

La mappa è duplicata come promemoria navigabile in `/settings/domains` (pagina "Domini"), che è scritta a mano e non riflette nessuno stato reale di DNS o deploy.

**Correzione 2026-08-13 (seconda) — `eventi.` puntava ancora a `/events`, la rotta dashboard.** A differenza delle classifiche (già spostate su `/rankings/*` sopra), `eventi.pauperwave.org` era rimasta mappata su `/events`, la rotta interna che richiede login e il layout `UDashboardPanel`. Corretto sullo stesso modello: nuova pagina standalone `/eventi` (`app/pages/(public)/eventi/index.vue`, layout `public-wide.vue`, componente `EventsPublicCalendarPage.vue`), aggiunta a `publicPrefixes` in `auth.global.ts`, a `redirectOptions.exclude` in `nuxt.config.ts`, a `HOST_ROUTE_MAP` in `shared/utils/publicHosts.ts` e alla `destination` di `vercel.json`. Non `/calendar` (prima scelta, scartata): esiste già come rotta dashboard non correlata, un placeholder "in sviluppo" collegato dalla sidebar (`pages/calendar/index.vue`, `nav.calendar`). `EventsPublicCalendarPage.vue` riusa `useEventsQuery`/`useEventsFilters` come `events/index.vue`, ma senza `EventsListAddModal`/`NotificationsBellButton` (richiedono auth) e con le card **non cliccabili** — `GridView.vue` punta a `/events/<id>`, pagina di dettaglio interna, che rimbalzerebbe un visitatore anonimo a `/login`. Vista calendario/ICS scaricabile (`docs/TODO.md`) resta fuori scope, non richiesta in questo giro.

### ADR-012 — Secondo criterio di spareggio del Campionato Cittadino (2026-08-09)

**Contesto:** il regolamento ufficiale definisce lo spareggio a un solo livello: *"a parità di punteggio passa chi ha fatto il punteggio più alto in singolo evento"*. Non dice cosa succede se anche quello coincide. Non è un caso di scuola: già sui dati mock di `/cittadino` (46 giocatori, 24 eventi) il 16° e il 17° posto risultavano entrambi a 71 punti **e** entrambi con 25 come miglior risultato singolo — cioè il pareggio irrisolto cadeva esattamente sulla riga che separa chi accede alla finale da chi resta fuori. Senza un secondo criterio l'ordine è quello che capita dall'algoritmo di sort, cioè arbitrario.

**Decisione:** due criteri, in quest'ordine:
1. **Miglior punteggio in un singolo evento** — dal regolamento.
2. **Maggior numero di eventi disputati** — decisione presa dall'utente il 2026-08-09, non presente nel testo scritto.

Implementato in `useCittadinoFilters.ts` come catena di comparatori dopo il totale, e riflesso nella pagina `/rulesets`, che è la sede pubblica del regolamento nell'app.

**Conseguenze:** il secondo criterio è una nostra integrazione, non una regola pubblicata: va ratificata dallo staff e aggiunta al testo ufficiale del regolamento, altrimenti l'app applicherebbe un criterio che i giocatori non hanno mai letto — su una posizione che assegna l'accesso alla finale. Resta teoricamente possibile un pareggio a tre livelli (stessi punti, stesso miglior singolo, stesso numero di eventi); in quel caso l'ordine torna arbitrario e servirà un terzo criterio, ma non vale la pena sceglierlo prima di vederlo accadere su dati veri.

### ADR-013 — Evidenziazione riga/colonna di `StandingsMatrixTable` considerata ottimizzata (2026-08-09)

**Contesto:** dopo aver corretto il crosshair di hover (riga via CSS puro, colonna via delegazione DOM + `useStyleTag` che inietta una regola `nth-child` scoped), ci si è chiesti se valesse la pena spingersi oltre — es. mutare la CSSOM direttamente invece di sostituire il `textContent` dello style tag, o passare a un attributo `data-hovered-col` con regole statiche pre-generate invece di CSS iniettato dinamicamente.

**Decisione:** nessuna ulteriore ottimizzazione, per ora. Analisi (non profilata sul progetto, ragionamento su ordini di grandezza): il costo del parsing CSS reinserito ad ogni hover è nell'ordine dei microsecondi (~150 byte, aggiornato al più una volta per colonna attraversata — `mouseover` scatta solo al cambio di cella, non ad ogni pixel di `mousemove`); il costo dominante è lo style recalc successivo, identico indipendentemente dalla tecnica di iniezione. Le soglie oltre cui varrebbe la pena rifarlo (>1000 righe, o eventi a framerate) sono molto sopra la scala reale (46 righe × 29 colonne, ~1300 celle). L'unica ottimizzazione con impatto misurabile — rimuovere `transition-colors` dall'hover di riga — era già stata fatta prima di questa valutazione.

**Conseguenze:** non toccare la logica del crosshair finché il DevTools Performance panel non mostra concretamente "Style Recalculation" > 2ms per frame durante l'hover — cosa improbabile a questa scala. Se in futuro la tabella crescerà di molto (centinaia di righe, o un'interazione guidata da `mousemove` invece che `mouseover`), rivalutare passando a un attributo `data-hovered-col` con regole `nth-child` statiche pre-generate invece dell'iniezione dinamica di testo CSS.

### ADR-014 — Fallback per nome su CardTrader quando `scryfall_id` manca lato loro (2026-08-11)

**Contesto:** la ricerca di "Stilt-Man, Towering Terror" (set "Commander: Marvel Super Heroes", `msc`, uscito il 26/06/2026) risultava introvabile su CardTrader nonostante il prodotto esistesse davvero (blueprint id `393799`). `resolveCardTraderBlueprint` (`server/utils/cardTrader.ts`) fa match esatto tra lo `scryfall_id` di Scryfall e quello di ogni blueprint dell'export CardTrader per l'espansione risolta da `setCode`. Verificato sui dati reali: di 338 blueprint del set `msc`, 181 (oltre metà) hanno `scryfall_id: null` lato CardTrader — non è un caso isolato, ma un ritardo strutturale nel loro backfill per i set appena usciti.

**Decisione:** quando il match per `scryfall_id` fallisce su tutte le espansioni candidate, viene fatto un secondo tentativo per **nome esatto della carta** (recuperato da Scryfall con una singola chiamata) tra i blueprint già scaricati nel primo giro — nessuna chiamata aggiuntiva a CardTrader. Il blueprint trovato viene comunque salvato in cache (`pauperwave_cardtrader_blueprints`) con il nostro `scryfallId`, così le ricerche successive per la stessa carta restano immediate anche se CardTrader non collega mai lo `scryfall_id` sul proprio lato.

**Conseguenze:** il match per nome è meno rigoroso di quello per id (in teoria un nome duplicato tra printing diverse della stessa espansione potrebbe produrre un falso positivo, ma non è mai stato osservato e lo scope per espansione lo rende improbabile). Se in futuro emergono falsi positivi, va aggiunto anche il collector number come secondo criterio di spareggio — oggi non salvato da nessuna parte nel flusso wanted-cards, richiederebbe di propagarlo lungo tutta la catena di chiamata.

## Vedi anche

- `docs/architecture/database.md` — schema, RLS, migrazioni
- `docs/BACKLOG.md` / `docs/TODO.md` — lavoro pianificato e osservazioni aperte
