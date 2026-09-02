# Bot Telegram

<!-- docs/architecture/telegram-bot.md -->

Compagno leggibile dell'implementazione (`server/utils/telegram/`, `server/api/telegram/webhook.post.ts`) — stesso schema di `docs/architecture/permissions.md`: qui lo stato di ogni funzionalità, non solo l'intenzione. Scritto 2026-09-02, all'avvio dell'integrazione (grammY, webhook via Nitro/h3). Per il dettaglio "chi viene notificato per quale evento" vedi `docs/architecture/telegram-notifications.md`.

## Legend

- 🟢 Implementato e funzionante
- 🟡 Parziale — funziona ma con una limitazione nota (vedi Note)
- 🔴 Pianificato, non ancora costruito
- ⚫ Fuori scope per ora — richiede una feature nuova nell'app stessa, non solo nel bot

## Livelli di accesso

- **Pubblico** — chiunque scriva al bot, nessun collegamento richiesto
- **Collegato** — richiede aver associato la chat a un socio (email fornita al primo `/start`, verificata su `pauperwave_associates`); non ancora costruito, vedi tabella

## Comandi e funzionalità

| Comando/funzionalità | Accesso | Stato | Note |
|---|---|---|---|
| `/start` | Pubblico | 🟡 | Risponde con un messaggio di benvenuto. Non chiede ancora l'email di collegamento (vedi riga sotto). |
| `/help` | Pubblico | 🟢 | Elenco comandi disponibili. |
| `/status` | Pubblico | 🟢 | Liveness check, risponde "🟢 Bot operativo." |
| `/whoami` | Pubblico | 🟢 | Restituisce il `chat_id` numerico — helper di setup (es. per popolare a mano una riga in `pauperwave_associate_telegram_links`), non pensato per gli utenti finali. |
| `/classifiche` | Pubblico | 🟡 | Pauper/Commander/Premodern: calcolo reale (riusa `groupBestNByPlayer`, `shared/utils/cittadino/bestNStandings.ts`), top 10 + link alla pagina completa. Cittadino: solo link, nessun calcolo (scoring best-11 diverso, non replicato nel bot). |
| `/eventi` | Pubblico | 🔴 | Prossimi eventi — dati reali già disponibili (`events`), da costruire. Comando registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| `/tornei` | Pubblico | 🔴 | Prossimi tornei, con bottoni per filtrare per location/mese (stesso pattern `InlineKeyboard` di `/classifiche`). Comando registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| `/leghe` | Pubblico | 🔴 | Leghe attive. Comando registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| Collegamento chat↔socio | Collegato | 🟡 | **Tabella creata 2026-09-02** (`pauperwave_associate_telegram_links` — `associate_uuid` unique, `chat_id` unique, RLS on senza policy client, come `pauperwave_cardtrader_expansions`; migrazione `20260902065723`). Una riga bootstrap inserita a mano per il super_admin (Emanuele Nardi). Manca ancora il flusso vero: al primo `/start` il bot deve chiedere l'email associata (skippabile con `/skip`), verificarla su `pauperwave_associates` e scrivere la riga da solo — oggi l'unico modo di popolare la tabella è un insert manuale via SQL. Rate-limit sui tentativi falliti da aggiungere (email da sola è indovinabile/nota). Non ancora un comando a sé — resta dentro `/start`, non stubbato separatamente. |
| Stato tesseramento / ultimo rinnovo | Collegato | 🔴 | Richiede il collegamento sopra. Comando `/tessera` registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| "I miei tornei" (iscrizioni) | Collegato | 🔴 | Dati già disponibili (`pauperwave_tournament_registrations`), da esporre via comando una volta fatto il collegamento. Comando `/mieitornei` registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| Notifiche per formato seguito | Collegato | 🔴 | Richiede il collegamento sopra + una colonna/tabella per i formati seguiti + un trigger lato server alla creazione di un torneo/evento che avvisa gli iscritti (`notifyTelegramAdmins`/`sendTelegramMessage`, già scaffoldati in `server/utils/telegram/notify.ts`, oggi senza alcun call site). Comando `/notifiche` registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| Promemoria torneo (giorno prima + un'ora prima) | Collegato | 🔴 | Usa iscrizione + data torneo, nessun pairing necessario — bloccato dallo stesso collegamento chat↔socio sopra (serve sapere a chi mandare il promemoria). Proposto: job `pg_cron` (stesso pattern di `purge_expired_trash()`, ADR-028) che ogni 15-30 min interroga le iscrizioni in finestra e chiama un endpoint Nitro dedicato. Non ancora un comando — nessuno stub, è automatico, non richiesto dall'utente. |
| Alert admin — nuova domanda di tesseramento, richiesta di rinnovo | — (staff, ruolo `admin`/`super_admin`) | 🟢 | **Collegato 2026-09-02**: `associates/apply.post.ts` e `associates/renew.post.ts` chiamano `notifyTelegramAdmins()` dopo `recordMembershipEvent(...)` (azioni innescate dal socio, non dall'admin — scartato "nuovo pagamento quota associativa" perché è l'admin stesso a compierlo, notificarlo di un'azione propria è rumore). Best-effort: un errore Telegram/DB viene loggato, non fa fallire la richiesta di tesseramento/rinnovo (`notify.ts`, `Promise.allSettled`). Destinatari risolti da `get_admin_telegram_chat_ids()` (funzione Postgres, migrazione `20260902102812`), niente `TELEGRAM_ADMIN_CHAT_ID` da env var. |
| Alert errori tecnici | — (solo `super_admin`) | 🟡 | `notifyTelegramSuperAdmins()` esiste (`notify.ts`, stessa RPC di sopra con `p_roles: ['super_admin']`), ma nessun errore dell'app la chiama ancora. Canale separato dagli alert di dominio: un errore tecnico va a un unico punto di responsabilità (il super_admin), non sparso su tutti gli admin. |
| Tavolo/avversario per turno | Collegato | ⚫ | **Corretto 2026-09-02: il concetto esiste nello schema, la conclusione "fuori scope" resta valida ma per un motivo diverso da quello scritto qui in origine.** `tournament_pairings` (`table_number`, fino a 4 giocatori, `round_uuid`) e `tournament_rounds` esistono davvero nel DB — non è vero che manchi il concetto di pairing/turno. Ma nessun `server/api/*` scrive su quelle tabelle: l'unico punto che le legge è `useCommanderMatchHistoryQuery.ts` (sola lettura, "Storico Partite" su `/players/[slug]`), quindi sembrano popolate solo via backfill storico, non da un flusso live in cui un organizer genera gli abbinamenti durante un torneo in corso. Finché non esiste quel flusso di scrittura live, il bot non ha un "tavolo di adesso" da poter leggere. In più (chiarito dall'utente 2026-09-02): queste tabelle sono state modellate **specificamente per Commander** (fino a 4 giocatori per pairing) e sono ancora da rivedere — resta da decidere come rendere lo schema agnostico rispetto al formato prima che possa servire anche Pauper/Premodern (Swiss 1v1). Comando `/tavolo` registrato, risponde spiegando il blocco (`commands/stubs.ts`), non un generico "da implementare". |
| `/cartecercate` | Pubblico | 🔴 | Elenco delle richieste "Carta Cercata" attive (dominio reale, `pauperwave_wanted_cards`). Da collegato, potrebbe filtrare sulle proprie. Comando registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| `/prossimotorneo` | Pubblico | 🔴 | Scorciatoia rispetto a `/tornei`: solo il prossimo evento in ordine cronologico, nessun bottone. Comando registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| "I miei mazzi Commander" (vedi lista) | Collegato | 🔴 | Dati già disponibili (`commander_decks`, collegato a `player_uuid`) — sola lettura, costruibile subito una volta fatto il collegamento chat↔socio. Comando `/mieimazzi` registrato, risponde "🚧 da implementare" (`commands/stubs.ts`). |
| "Imposta il bracket" su un mazzo Commander | Collegato | ⚫ | **Non costruibile oggi**: `commander_decks` non ha una colonna `bracket` (sistema Commander Bracket 1-5) — serve prima una migrazione Supabase per aggiungerla, poi il comando può scriverla. Più piccolo del gap "pairing" sopra (una colonna, non un sottosistema), ma non ancora pronto. Comando `/bracket` registrato, risponde spiegando il blocco (`commands/stubs.ts`), non un generico "da implementare". |

## Note

**La sicurezza del collegamento chat↔socio è deliberatamente leggera.** Discusso 2026-09-01/02: l'opzione più sicura ("Collega Telegram" dalla sezione Profilo del sito, con token monouso generato da una sessione già autenticata) è stata scartata — il giocatore medio non visita mai le Impostazioni del sito, quel flusso non verrebbe mai usato. Si è scelto invece di chiedere solo l'email direttamente in chat al primo `/start`, accettando che l'email da sola sia un fattore debole (nota/indovinabile), perché i dati dietro il collegamento oggi sono a bassa sensibilità (stato tesseramento, preferenze di notifica — non saldo, non pagamenti). Se in futuro il bot esporrà dati più sensibili, l'asticella di verifica va alzata solo per *quel* comando specifico, non per il collegamento base.

**`/classifiche` non calcola Cittadino perché il suo scoring è strutturalmente diverso** (miglior-11 su tutti i formati, con tie-break — ADR-012, `docs/PROGRESS.md`) da quello delle classifiche per formato (`groupBestNByPlayer` semplice). Replicarlo nel bot avrebbe richiesto portare anche quella logica lato server prima che i dati sottostanti siano reali (issue #2) — rimandato.

## Aggiornare questa tabella

Ogni volta che un comando passa da 🔴/⚫ a 🟡/🟢 (o viceversa, se qualcosa si rompe/viene rimosso), aggiornare la riga qui — stessa disciplina di `docs/architecture/permissions.md`: la tabella deve riflettere lo stato reale del codice, non l'intenzione.
