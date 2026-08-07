# PROGRESS — PauperWave Gestionale

<!-- docs/PROGRESS.md -->

Documento vivo per tracciare avanzamento, architettura e decisioni. Aggiornare quando cambiano scope, stack o convenzioni rilevanti.

**Ultimo aggiornamento:** 2026-08-05

---

## Obiettivo del progetto

Gestionale per l'associazione **PauperWave**: organizzazione di tornei multi-formato — non solo Commander, ma anche Premodern, Draft, Pauper, ecc. — gestione tesseramenti/rinnovi, incassi, e creazione/gestione completa dei tornei.

Diverse tabelle nello schema attuale (`mtg_commanders`, `commander_decks`, `tournament_kills`, `tournament_pairings` a 4 posti fissi, `tournament_votes`, la famiglia `rulesets`) incorporano assunzioni specifiche di Commander a livello di schema, non solo di dati — vedi `docs/architecture/database.md` per l'inventario completo tabella-per-tabella. Prima di costruire i flussi Premodern/Draft/Pauper serve una decisione di design su queste tabelle: renderle format-aware, oppure tenerle esplicitamente Commander-only con un percorso parallelo/generico per gli altri formati.

Il database Supabase di questo progetto è inoltre destinato a diventare la base per il futuro rebuild di `MagicTheGathering/league` — la correttezza/stabilità dello schema ha quindi priorità su refactor o feature non essenziali finché questo obiettivo non è raggiunto.

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

### ADR-003 — Questo DB come base per `MagicTheGathering/league` (2026-08-05)

**Contesto:** il DB Supabase di `app` è destinato a diventare la fondazione del futuro rebuild di `league`, un progetto sorella già più maturo.

**Decisione:** finché questo obiettivo non è raggiunto, la priorità va alla correttezza/stabilità dello schema (colonne morte, drift nome-campo tra DB e codice, nullability, policy RLS sovrapposte — vedi `docs/architecture/database.md` e `docs/TODO.md`) rispetto a refactor o feature non essenziali nel codice applicativo.

**Conseguenze:** richieste di refactor "carino ma non necessario" (es. estrarre configurazioni/badge condivisi tra domini non correlati) vengono deliberatamente rimandate — vedi `docs/audits/2026-08-05-fallow-dupes-review.md`.

### ADR-004 — `UTimePicker` custom mantenuto invece di `UInputTime` nativo (2026-08-05)

**Contesto:** Nuxt UI 4.10.0 include nativamente `UInputTime`, un possibile sostituto del componente `app/components/inputs/UTimePicker.vue` scritto a mano (due `USelect` per ore/minuti in un `UPopover`).

**Decisione:** mantenuto il componente custom. Motivo esplicito dell'utente: permette di scegliere liberamente l'intervallo dei minuti (`minuteStep`) con un'interazione a dropdown che preferisce, anche se `UInputTime` espone un prop `step` potenzialmente equivalente.

**Conseguenze:** non riproporre questa sostituzione in futuro a meno che l'utente non la sollevi di nuovo.

### ADR-005 — Ordine colonne tabella "Carte Cercate" (2026-08-07)

**Contesto:** la tabella `wanted-cards` (Giocatore, Data, Stato, Carta, Copie, Lingua, Trattamento, Note) aveva un ordine colonne non deliberato, emerso incrementalmente durante lo sviluppo della feature.

**Decisione:** ordine finale **Giocatore → Carta → Copie → Lingua → Trattamento → Data → Stato → Note**. Logica: leggere le colonne da sinistra a destra come una frase — "[Giocatore] wants [Carta] ×[Copie] in [Lingua], [Trattamento]" — raggruppando gli attributi specifici della richiesta (cosa si cerca) subito dopo il soggetto, prima di passare ai metadati di tracciamento (Data/Stato, che riguardano il ciclo di vita della richiesta, non cosa viene cercato), con Note per ultima in quanto testo libero.

**Conseguenze:** Stato finisce penultima colonna nonostante sia informazione ad alta priorità per la scansione visiva — accettabile perché è già resa come badge colorato, quindi resta scansionabile indipendentemente dalla posizione.

## Vedi anche

- `docs/architecture/database.md` — schema, RLS, migrazioni
- `docs/BACKLOG.md` / `docs/TODO.md` — lavoro pianificato e osservazioni aperte
