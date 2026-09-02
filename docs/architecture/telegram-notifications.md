# Notifiche Telegram

<!-- docs/architecture/telegram-notifications.md -->

Chi viene notificato, per quale evento, e da dove — compagno di `telegram-bot.md` (che copre i comandi) e di `permissions.md` (stesso schema legenda/tabella/note). Riguarda solo i messaggi Telegram push (`notifyTelegramAdmins`/`notifyTelegramSuperAdmins`/`sendTelegramMessage`, `server/utils/telegram/notify.ts`) — non il sistema di notifiche in-app (campanella, `server/api/notifications.ts`, ancora mock), un meccanismo separato. Scritto 2026-09-02.

## Legend

- 🟢 Collegato e funzionante
- 🔴 Pianificato, non ancora collegato
- ⚪ Non più necessario — il problema che l'avrebbe giustificato è stato risolto alla radice

## Eventi e destinatari

| Evento | Trigger | Destinatario | Funzione | Stato |
|---|---|---|---|---|
| Nuova domanda di tesseramento | `server/api/associates/apply.post.ts` | `admin` + `super_admin` collegati | `notifyTelegramAdmins()` | 🟢 |
| Richiesta di rinnovo tesseramento | `server/api/associates/renew.post.ts` | `admin` + `super_admin` collegati | `notifyTelegramAdmins()` | 🟢 |
| ~~Fallimento tecnico: pagamento scritto ma rinnovo non aggiornato~~ | ~~`server/api/transactions/create.post.ts`, `[id]/update.post.ts`~~ | ~~Solo `super_admin` collegati~~ | ~~`notifyTelegramSuperAdmins()`~~ | ⚪ risolto 2026-09-02 con le RPC transazionali, vedi Note |

## Note

**Risolto 2026-09-02: il caso "pagamento fallito" non esiste più, niente alert necessario.** Le tre scritture non transazionali (`pauperwave_payments` poi `pauperwave_associate_renewals`, nei tre endpoint create/update/delete) sono state sostituite da tre RPC Postgres — `create_payment_with_renewal`, `update_payment_with_renewal`, `delete_payment_with_renewal` (migrazione `20260902105738`), stesso pattern di `register_tournament_players` — che fanno scrittura pagamento + riconciliazione rinnovo nella stessa transazione. Un fallimento a metà ora fa rollback di tutto: l'admin vede un 500 pulito, nessuno stato inconsistente da riparare, quindi non serve un alert Telegram per questo caso. `server/utils/associateRenewals.ts` (i tre helper TS `ensureRenewalForPayment`/`removeStaleRenewal`/`renewalYearFor`) è stato eliminato, la stessa logica ora vive in SQL (`ensure_payment_renewal`/`remove_stale_payment_renewal`, stessa migrazione). Trovato anche un bug preesistente non causato da questo lavoro: la sequenza `pauperwave_payments_id_seq` era disallineata (ferma a 705, max reale 716) e avrebbe bloccato **qualunque** nuovo inserimento — corretta con `setval` (migrazione `20260902110424`).

**Perché non "nuovo pagamento quota associativa" come evento notificabile.** Scartato 2026-09-02: è l'admin stesso a compiere l'azione (registra il pagamento) — notificarlo di qualcosa che ha appena fatto lui è rumore, non segnale. Vale in generale come criterio: un evento merita un alert solo se innescato da qualcun altro (socio/giocatore) a cui l'admin deve reagire, o se è un fallimento altrimenti invisibile (job automatico non presidiato, scrittura parziale silenziosa) — non ogni azione di dominio.

**Perché `admin`+`super_admin` per gli eventi di dominio, solo `super_admin` per gli errori tecnici.** Un errore tecnico ha bisogno di un punto di responsabilità unico per l'intervento, non sparso su tutto lo staff — vedi `docs/architecture/telegram-bot.md`.

## Aggiornare questa tabella

Ogni volta che si aggiunge una chiamata a `notifyTelegramAdmins()`/`notifyTelegramSuperAdmins()`/`sendTelegramMessage()` in un endpoint, aggiungere una riga qui — stessa disciplina di `permissions.md`/`telegram-bot.md`: la tabella deve riflettere lo stato reale del codice, non l'intenzione.
