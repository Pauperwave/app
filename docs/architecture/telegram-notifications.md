# Notifiche Telegram

<!-- docs/architecture/telegram-notifications.md -->

Chi viene notificato, per quale evento, e da dove — compagno di `telegram-bot.md` (che copre i comandi) e di `permissions.md` (stesso schema legenda/tabella/note). Riguarda solo i messaggi Telegram push (`notifyTelegramAdmins`/`notifyTelegramSuperAdmins`/`sendTelegramMessage`, `server/utils/telegram/notify.ts`) — non il sistema di notifiche in-app (campanella, `server/api/notifications.ts`, ancora mock), un meccanismo separato. Scritto 2026-09-02.

## Legend

- 🟢 Collegato e funzionante
- 🔴 Pianificato, non ancora collegato

## Eventi e destinatari

| Evento | Trigger | Destinatario | Funzione | Stato |
|---|---|---|---|---|
| Nuova domanda di tesseramento | `server/api/associates/apply.post.ts` | `admin` + `super_admin` collegati | `notifyTelegramAdmins()` | 🟢 |
| Richiesta di rinnovo tesseramento | `server/api/associates/renew.post.ts` | `admin` + `super_admin` collegati | `notifyTelegramAdmins()` | 🟢 |
| Fallimento tecnico: pagamento scritto ma rinnovo non aggiornato | `server/api/transactions/create.post.ts`, `[id]/update.post.ts` (`ensureRenewalForPayment`/`removeStaleRenewal` falliti dopo che `pauperwave_payments` è già scritto) | Solo `super_admin` collegati | `notifyTelegramSuperAdmins()` | 🔴 |

## Note

**Il caso "pagamento fallito" è in discussione, non ancora deciso se servirà davvero un alert.** Individuato 2026-09-02: le due scritture (`pauperwave_payments` poi `pauperwave_associate_renewals`) non sono transazionali — il client Supabase JS/PostgREST non supporta transazioni multi-statement, ogni `.insert()`/`.upsert()` è la sua richiesta a sé. Un fallimento a metà lascia il pagamento registrato ma il rinnovo mancante, uno stato inconsistente che un 500 generico non comunica. La correzione proposta è renderle atomiche spostandole in un'unica funzione Postgres (RPC), stesso pattern già usato da `register_tournament_players` (migrazione `20260825025133`, stesso identico problema per le registrazioni torneo) — con quella in mezzo, il caso "scrittura parziale" sparisce del tutto, e l'alert Telegram diventerebbe solo un "questa operazione è fallita" generico, meno critico. **Decisione rimandata**: prima valutare se costruire le RPC transazionali (`create_payment_with_renewal`/`update_payment_with_renewal`), poi decidere se serve ancora un alert e per cosa.

**Perché non "nuovo pagamento quota associativa" come evento notificabile.** Scartato 2026-09-02: è l'admin stesso a compiere l'azione (registra il pagamento) — notificarlo di qualcosa che ha appena fatto lui è rumore, non segnale. Vale in generale come criterio: un evento merita un alert solo se innescato da qualcun altro (socio/giocatore) a cui l'admin deve reagire, o se è un fallimento altrimenti invisibile (job automatico non presidiato, scrittura parziale silenziosa) — non ogni azione di dominio.

**Perché `admin`+`super_admin` per gli eventi di dominio, solo `super_admin` per gli errori tecnici.** Un errore tecnico ha bisogno di un punto di responsabilità unico per l'intervento, non sparso su tutto lo staff — vedi `docs/architecture/telegram-bot.md`.

## Aggiornare questa tabella

Ogni volta che si aggiunge una chiamata a `notifyTelegramAdmins()`/`notifyTelegramSuperAdmins()`/`sendTelegramMessage()` in un endpoint, aggiungere una riga qui — stessa disciplina di `permissions.md`/`telegram-bot.md`: la tabella deve riflettere lo stato reale del codice, non l'intenzione.
