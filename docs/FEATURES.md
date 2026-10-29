# Funzionalità

<!-- docs/FEATURES.md -->

Funzionalità dei tornei decise a parole, con lo stato di ciascuna: **fatta** o **da fare**. Quando una è fatta, la decisione sta in `PROGRESS.md` (ADR) e il comportamento in `architecture/telegram-bot.md`.

## Iscrizione tardiva (dopo l'inizio del torneo)

**Stato:** fatta (ADR-058, 2026-10-29).

Un giocatore può iscriversi anche a torneo già iniziato, per esempio al secondo turno: se il torneo è alle 20:30 e sono le 20:35, lo vede e si iscrive.

- Le iscrizioni restano accettate con il torneo `registration_open` **e** `in_progress`: una sola regola, `acceptsRegistrations` (`shared/utils/tournaments/registrationStatus.ts`), usata dal bot, dall'API `self-register` e dal pulsante del calendario.
- `/iscriviti` elenca i tornei fino alla loro fine (`ends_at`), non fino all'inizio.
- Se il torneo ha già avviato dei round, `/iscriviti` avvisa quanti (es. «Il torneo è già iniziato: sono già stati avviati 2 round»).
- Chi si iscrive a torneo avviato non ha abbinamenti nei round già creati: l'organizzatore lo inserisce dal turno successivo.

**Limiti noti:** l'avviso c'è solo in `/iscriviti`, non nel dettaglio del torneo; un torneo `in_progress` che supera `ends_at` sparisce dall'elenco anche se è ancora in corso.

## Drop dopo un round (anche senza inserimento dei punteggi)

**Stato:** da fare.

Un giocatore deve poter lasciare il torneo dopo aver giocato un round anche se non ha inserito il risultato (posizione, uccisioni, voti).

- **Oggi** `/drop` esiste solo per i tornei Commander e rifiuta il drop finché non c'è il risultato del turno («Prima inserisci il tuo risultato (/tavolo), poi potrai droppare», `commanderDrop.ts`); non è disponibile per i tornei 1v1.
- **Da fare:** togliere quell'obbligo, così il drop vale dal round successivo come adesso (ADR-048) senza dover compilare prima il risultato.
- **Da decidere:** cosa succede al round appena giocato senza punteggi (a chi lo completa, l'organizzatore o il giocatore che resta); se il drop senza risultato va esteso ai tornei 1v1.
