# Pauperwave Bot

<!-- docs/telegram-bot/README.md -->

**[@PauperwaveBot](https://t.me/PauperwaveBot)** è il bot Telegram dell'associazione Pauperwave: dalla chat consulti calendario, leghe e classifiche, gestisci le tue iscrizioni, riporti i risultati al tavolo e tieni la lista delle carte che cerchi.

Funziona con qualunque account Telegram. Alcune funzioni richiedono di collegare la chat al tuo profilo socio (vedi [Collegare il tuo account](#collegare-il-tuo-account)).

> Questa pagina è per chi usa il bot. Per come è fatto dentro, stato di ogni funzione e scelte tecniche: [`docs/architecture/telegram-bot.md`](../architecture/telegram-bot.md). Per chi riceve quale notifica: [`docs/architecture/telegram-notifications.md`](../architecture/telegram-notifications.md).

## Indice

- [Per iniziare](#per-iniziare)
- [Collegare il tuo account](#collegare-il-tuo-account)
- [Comandi](#comandi)
- [Le carte](#le-carte)
- [Durante un torneo](#durante-un-torneo)
- [Notifiche](#notifiche)
- [Aiuto e segnalazioni](#aiuto-e-segnalazioni)

## Per iniziare

1. Apri [@PauperwaveBot](https://t.me/PauperwaveBot) e premi **Avvia** (`/start`).
2. `/help` mostra tutti i comandi, con i bottoni per lanciarli al volo.
3. I comandi marcati *(collegato)* qui sotto funzionano solo dopo il collegamento.

I comandi di consultazione (classifiche, eventi, calendario, leghe, prezzi, dadi) sono pubblici: non serve essere soci.

## Collegare il tuo account

Il collegamento associa la tua chat Telegram al tuo profilo socio, così il bot sa chi sei.

1. Scrivi al bot, in privato, **l'indirizzo email con cui sei registrato come socio** (quello della tessera approvata).
2. Se l'email corrisponde a un socio approvato, la chat viene collegata.

| Comando | Cosa fa |
|---|---|
| `/collegamento` | Dice se questa chat è collegata e a quale socio |
| `/scollegamento` | Scollega la chat dal tuo profilo |

Un solo socio per chat e una sola chat per socio: collegandone una nuova, quella vecchia viene sostituita.

## Comandi

### Classifiche, eventi e tornei

| Comando | Accesso | Cosa fa |
|---|---|---|
| `/classifiche` | Tutti | Classifiche per formato: Pauper, Commander, Premodern e Cittadino, a pagine, con il link alla classifica completa sul sito |
| `/eventi` | Tutti | Prossimi eventi, con dettaglio (data, luogo, organizzatore) |
| `/calendario` | Tutti | Tornei del mese raggruppati per giorno, con la tappa di lega |
| `/leghe` | Tutti | Leghe attive, con tornei giocati e date |
| `/prossimo` | Tutti | Il prossimo torneo con iscrizioni aperte o in corso |
| `/iscrizioni` | Collegato | I tornei a cui sei iscritto (✅ iscritto, 🎯 check-in fatto) |

Dal dettaglio di un torneo puoi iscriverti o disiscriverti con un bottone, se sei collegato.

### Il tuo profilo

| Comando | Accesso | Cosa fa |
|---|---|---|
| `/tessera` | Collegato | Stato del tuo tesseramento: attivo, in scadenza o da rinnovare |
| `/collegamento`, `/scollegamento` | Tutti | Vedi [Collegare il tuo account](#collegare-il-tuo-account) |

### Utilità

| Comando | Cosa fa |
|---|---|
| `/turni` | Si apre come una piccola app dentro Telegram. Se sei collegato e siedi a un tavolo in corso, mostra il **conto alla rovescia del timer dell'evento**, lo stesso dell'organizzatore (non puoi fermarlo tu); quando parte la fase dei turni compare il contatore dei 5 turni aggiuntivi. Altrimenti c'è un timer a 50 minuti tutto tuo. Con il telefono in verticale, il bottone in alto a destra ruota il numero di 90° per renderlo più grande e leggibile da lontano (la scelta resta memorizzata) |
| `/dado` | Un dado a 6 facce, animato |
| `/moneta` | Testa o croce |
| `/tira [facce]` | Un dado a N facce, per esempio `/tira 20` (se non indichi le facce, 20) |
| `/status` | Verifica che il bot sia attivo |
| `/supporto` | Scrivi allo staff: vedi [Aiuto e segnalazioni](#aiuto-e-segnalazioni) |

## Le carte

### Controllare il prezzo

`/prezzo <carta>` oppure, in qualsiasi chat, `@PauperwaveBot $ <carta>`.

Il prezzo dipende dalla stampa, quindi **scegli sempre tu quale**: il bot elenca una riga per stampa, dalla più economica, con set, numero di collezione, prezzo CardMarket (normale e foil) e miniatura. Toccando una riga, il messaggio con il prezzo viene inviato nella chat.

Il messaggio mostra:
- il prezzo **CardMarket** della stampa;
- il prezzo **CardTrader**, il minimo Near Mint della stessa stampa;
- i bottoni **Tutte / ITA / ENG** e **Foil** per filtrare. Il foil compare solo se la stampa esiste in entrambe le finiture;
- i link a CardMarket, CardTrader e Scryfall.

Nota: il filtro lingua vale solo per CardTrader. Il prezzo CardMarket arriva da Scryfall e non è disponibile per lingua; il messaggio lo ricorda quando scegli ITA o ENG.

Poiché funziona anche in modalità inline, puoi usarlo per mostrare il prezzo a chi è in chat con te, per esempio in un gruppo.

### Le carte che cerchi

Tieni la lista delle carte che stai cercando, la stessa che vedi sul sito. Serve il collegamento.

**Aggiungere una carta**
- Dal messaggio del prezzo, con **➕ Aggiungi alle mie cercate**: salva quella stampa con i filtri attivi (ITA/ENG diventano la lingua preferita, "Tutte" significa nessuna preferenza; Foil attivo diventa foil). Se la stessa stampa con stessa lingua e finitura è già nella lista, il bot risponde *"È già nel tuo elenco"*.
- Incollando un elenco, vedi sotto.

**Incollare un elenco: `/importa`**

Una carta per riga, nel formato usato dai siti di mazzi:

```
1 Clock of Omens (M13) 202
1 Erode (SOS) 15
1 Storm the Vault // Vault of Catlacan (RIX) 173
```

Quantità, set e numero sono facoltativi (`2x Lightning Bolt` oppure solo `Counterspell`); `*F*` a fine riga indica una carta foil. Puoi usarlo in tre modi:
- `/importa` seguito dall'elenco nello stesso messaggio;
- `/importa` da solo, poi rispondi al messaggio del bot incollando l'elenco;
- incollando direttamente un elenco in cui **ogni** riga ha la forma completa `quantità nome (SET) numero`.

Il bot riconosce ogni riga su Scryfall (prima per set e numero, poi per nome) e risponde con il riepilogo: quante ne ha aggiunte, quali erano già nel tuo elenco e quali non ha trovato. Le carte aggiunte hanno lingua qualsiasi e le copie indicate dalla quantità. Un messaggio può contenere al massimo 60 righe.

**Vedere e togliere: `/cercate`**

Mostra le carte che stai ancora cercando, 8 per pagina, con ◀ ▶ per spostarti. Ogni riga ha un bottone 🗑 numerato come l'elenco: il bot chiede conferma e poi toglie quella carta (la cancellazione è recuperabile dallo staff). Funziona solo in chat privata.

Dal bot si aggiunge, si consulta e si toglie. **Modificare lingua, copie o note e gestire lo stato delle richieste si fa dal sito.**

## Durante un torneo

Se sei collegato e siedi a un tavolo di un torneo in corso:

- **`/tavolo`**: mostra torneo, round e avversari. Nei tavoli Commander ha anche il bottone per **impostare il tuo comandante** (cercandolo con la modalità inline di Telegram). Il bottone **✍️ Inserisci risultato** apre l'inserimento del risultato del turno:
  - **1 contro 1**: scegli l'esito dal tuo punto di vista (2-0, 2-1, 1-2, 0-2), controlli il riepilogo e invii. Il risultato è subito valido e l'avversario riceve un messaggio per confermarlo (✅ Confermo) o contestarlo (❌ Non è corretto). Una contestazione non annulla il risultato: lo segnala all'organizzatore per la revisione.
  - **Commander (3-4 giocatori)**: un passo alla volta, posizione, uccisioni, voto al mazzo e voto alla giocata, poi il riepilogo. Ogni scelta viene salvata subito. I riepiloghi dei voti ricevuti e del punteggio arrivano quando **tutti** i giocatori del tavolo hanno inserito posizione e voti; se qualcuno manca, il bot ti dice chi e il bottone 🔄 Aggiorna li invia appena ha finito.
- **`/drop`**: lasci il torneo Commander, dopo aver inserito il risultato.
- **`/turni`**: il contatore dei turni aggiuntivi.

## Notifiche

Se sei collegato, il bot ti scrive per primo quando succede qualcosa che ti riguarda in un torneo:

- sei stato **accettato** al torneo;
- i **tavoli** del round sono stati annunciati;
- un round o un torneo è stato **annullato**.

Se non hai collegato Telegram non ricevi nulla: nessun errore, semplicemente non c'è dove mandarlo.

## Aiuto e segnalazioni

- **`/supporto`**: il bot ti chiede di scrivere il messaggio e lo inoltra allo staff, con il tuo nome se sei collegato. Lo staff può risponderti direttamente, e la risposta ti arriva in chat come *"Risposta dallo staff"*.
- `/help` ricorda in ogni momento i comandi disponibili.
- Per bug o proposte sul bot, apri una [issue](https://github.com/Pauperwave/app/issues) nel repository.
