# Il sito Pauperwave: sezioni e funzionalità

<!-- docs/site/README.md -->

Mappa di ogni sezione del gestionale **Pauperwave**, con quello che si può fare in ciascuna e chi può accedervi. È organizzata come la barra laterale del sito. Per il bot Telegram vedi [`docs/telegram-bot/README.md`](../telegram-bot/README.md); per i permessi nel dettaglio, [`docs/architecture/permissions.md`](../architecture/permissions.md).

## Indice

- [Chi può fare cosa](#chi-può-fare-cosa)
- [Pagine pubbliche](#pagine-pubbliche)
- [Dashboards](#dashboards)
- [Community](#community)
- [Competizioni](#competizioni)
- [Classifiche](#classifiche)
- [Commander](#commander)
- [Impostazioni](#impostazioni)
- [Strumenti trasversali](#strumenti-trasversali)

## Chi può fare cosa

L'accesso al gestionale è con **link magico via email**: chi vuole entrare scrive la propria email, che deve appartenere a un socio, e riceve un link. Ogni account ha un ruolo, e la barra laterale mostra solo le sezioni consentite al proprio.

| Ruolo | In breve |
|---|---|
| **Giocatore** (`player`) | Vede tornei, leghe, eventi, classifiche e carte cercate; si iscrive per sé; gestisce le proprie carte cercate e i propri mazzi Commander |
| **Organizzatore** (`organizer`) | In più: crea e gestisce tornei, leghe ed eventi, registra i pagamenti, vede soci, giocatori, finanze, luoghi e regolamenti |
| **Admin** (`admin`) | In più: anagrafica soci e quote associative, impostazioni, ricevute, cestino, assegnazione dei ruoli |
| **Super admin** (`super_admin`) | In più: eliminazioni definitive, tornei "di prova", cancellazione definitiva dal cestino |

Nelle tabelle sotto, **Accesso** indica il ruolo minimo per aprire la pagina. Una sezione senza nessuna voce visibile per il proprio ruolo non compare.

## Pagine pubbliche

Aperte a chiunque, senza accesso. Per ora tutte servite da questo progetto; i sottodomini sono elencati in [Impostazioni → Domini](#impostazioni).

| Pagina | Cosa offre |
|---|---|
| `/tesseramento` | **Domanda di tesseramento** in autonomia. Si verifica prima l'email con un link; poi un modulo a passi (dati anagrafici, residenza, consensi). Un socio già registrato è indirizzato al **rinnovo**. Contiene i link allo statuto e alle informative su dati e privacy |
| `/calendario` | Calendario pubblico di tornei ed eventi: scheda con dettaglio, aggiunta al proprio calendario, condivisione, contatto e iscrizione |
| `/classifiche` | Le classifiche pubbliche per **Cittadino**, **Commander**, **Premodern** e **Pauper** (oggi con dati di esempio, vedi [Classifiche](#classifiche)) |
| `/login` | Accesso con link via email, riservato ai soci |

## Dashboards

| Sezione | Accesso | Funzionalità |
|---|---|---|
| **Home** (`/`) | Tutti | Cambia in base al ruolo. Il **giocatore** vede il proprio tesseramento, i propri pagamenti, i prossimi tornei e le classifiche. Lo **staff** vede i numeri chiave (soci attivi, tornei e eventi in arrivo, carte cercate aperte, sedi), le azioni in sospeso (richieste di tesseramento e tesseramenti in scadenza), i prossimi tornei, le ultime transazioni, gli ultimi soci approvati, la prossima sede e le leghe attive. Un menu di creazione rapida aggiunge una transazione, un socio, un torneo, un evento o una lega |
| **Calendario** (`/calendar`) | Tutti | Calendario dei tornei e degli eventi con le schede dettagliate |
| **Statistiche** (`/statistics`) | Tutti | Numeri e grafici sull'associazione: soci totali, nuove iscrizioni dell'anno, non rinnovati, età mediana, tornei ospitati, rinnovi registrati; crescita (nuovi, rinnovati, non rinnovati), tornei per anno e formato, distribuzione per età, rinnovi per mese, carte cercate per stato. Ha un tour guidato |
| **Finanze** (`/finance`) | Organizzatore | Rendiconto per **anno**: totale, commissioni, netto, numero e media dei pagamenti, con riepiloghi per mese, tipo, formato, torneo e metodo di pagamento e relativi grafici |

## Community

| Sezione | Accesso | Funzionalità |
|---|---|---|
| **Transazioni** (`/transactions`) | Organizzatore | Elenco dei pagamenti: quote di tornei ed eventi (organizzatore) e **quote associative** (admin, perché registrarne una rinnova il socio). Aggiunta e modifica, azioni su più righe, invio della ricevuta via email (admin) |
| **Richieste** (`/associates/requests`) | Organizzatore | Le domande di tesseramento e i rinnovi in attesa, da approvare o rifiutare |
| **Associati** (`/associates`) | Organizzatore | Anagrafica dei soci con ricerca e filtri (stato del tesseramento: attivo, da rinnovare, scaduto, non pagato). Scheda del socio con dati personali, residenza, consensi e **storico dei rinnovi**; numero di tessera; vista su mappa; stato del collegamento Telegram. Modifica ed eliminazione sono per admin |
| **Giocatori** (`/players`) | Organizzatore | I giocatori con le loro statistiche, i **mazzi Commander**, lo storico delle partite Commander e gli accessi. Ogni giocatore gestisce i propri mazzi, gli admin quelli di tutti |
| **Carte cercate** (`/wanted-cards`) | Tutti | Le carte che i soci cercano. Si crea una richiesta scegliendo la stampa da Scryfall, con lingua, foil, copie e note; prezzi CardMarket e CardTrader. Tre viste: tabella, griglia e compatta, con filtri. Ognuno gestisce le proprie richieste (cambio di stato in *trovata* o *abbandonata*, eliminazione); lo staff gestisce quelle di tutti. Alcune azioni sono anche nel [bot](../telegram-bot/README.md) |

## Competizioni

| Sezione | Accesso | Funzionalità |
|---|---|---|
| **Tornei** (`/tournaments`) | Tutti (modifica: organizzatore) | Elenco con filtri e viste a griglia e compatta; creazione e modifica con dati del torneo, orari, organizzatore e notifiche. Un torneo può appartenere a una lega o a un evento |
| **Scheda torneo** (`/tournaments/<id>`) | Tutti (gestione: organizzatore) | Il centro operativo: **iscrizioni** e accettazione dei partecipanti, **gestione dei round** con abbinamenti, **timer** del round, **inserimento dei risultati**, **classifica** in tempo reale e **premi**. Il torneo **Commander** è a tavoli da 3-4 giocatori, con comandante, uccisioni, voti al mazzo e alla giocata; gli altri formati (Pauper, Premodern, Oldschool, Sealed, Cubo Vintage) sono **a turni svizzeri** 1 contro 1. Anteprima dei tavoli, vista a schermo intero dei tavoli, regole di abbinamento configurabili. Annullare un round è per admin |
| **Leghe** (`/leagues`) | Tutti (modifica: organizzatore) | Una lega raccoglie i propri tornei: quanti, quanti conclusi, formati e date, calcolati dai tornei. Può avere un **regolamento** (punteggio Commander a punti). Scheda con i tornei della lega; la classifica della lega è ancora un'anteprima con dati di esempio |
| **Eventi** (`/events`) | Tutti (modifica: organizzatore) | Eventi con programma della giornata, partner e dettagli; possono contenere tornei. Si copia o si apre il **link pubblico** |
| **Luoghi** (`/locations`) | Organizzatore | Le sedi: contatti, orari di apertura, posizione su mappa, social, tipologia e stato; scheda di presentazione |
| **Regolamenti** (`/rulesets`) | Organizzatore | I regolamenti di punteggio per formato (Commander, Cittadino, draft, sealed). Eliminarne uno è per admin |

## Classifiche

Menu a tendina con quattro pagine, presenti anche tra le [pagine pubbliche](#pagine-pubbliche).

> **Attenzione:** le classifiche del **sito** mostrano oggi **dati di esempio**, non i risultati reali: manca ancora la tabella delle classifiche che le alimenti. Le classifiche del **[bot](../telegram-bot/README.md)** (`/classifiche`) sono invece calcolate sui risultati veri.

| Pagina | Funzionalità |
|---|---|
| **Cittadino** | Matrice generale su tutti i formati, con le proprie regole di punteggio (migliori 11 risultati) e di parità; filtro per formato |
| **Commander**, **Premodern**, **Pauper** | Classifica per formato, per lega stagionale, con i risultati contati e la soglia di qualificazione |

## Commander

| Sezione | Accesso | Funzionalità |
|---|---|---|
| **Mazzi** (`/statistics/decks`) | Tutti | I mazzi Commander con carta del comandante, vista a schede e compatta, scheda del mazzo |
| **Comandanti** (`/statistics/commanders`) | Tutti | I comandanti giocati, con statistiche come la percentuale di vittorie, e scheda del comandante |

## Impostazioni

Tutta la sezione è per **admin**; nel Cestino, l'eliminazione definitiva è solo per super admin.

| Pagina | Funzionalità |
|---|---|
| **Generale** (`/settings`) | Quota associativa, durata dei round, round di default e tabella dei round svizzeri; per quanto tempo il cestino conserva gli elementi |
| **Profilo** (`/settings/profile`) | I propri dati: nome, email, nome utente, avatar, biografia |
| **Membri** (`/settings/members`) | Chi ha un account e con quale ruolo; assegnazione dei ruoli (un admin non può dare o togliere il ruolo di super admin) |
| **Permessi** (`/settings/permissions`) | Tabella di consultazione: chi può fare cosa, e se la funzione è già operativa |
| **Domini** (`/settings/domains`) | Promemoria della mappa dei sottodomini di `pauperwave.org` e della pagina che ciascuno serve. Non legge il DNS: lo stato è scritto a mano |
| **Notifiche** (`/settings/notifications`) | Preferenze di notifica |
| **Cestino** (`/trash`) | Le righe eliminate (tornei, leghe, eventi, carte cercate...) si possono **ripristinare** (admin) o **eliminare per sempre** (super admin). Dopo il periodo di conservazione impostato, l'eliminazione è automatica |

## Strumenti trasversali

- **Ricerca e comandi rapidi**: una palette di comandi per saltare a una pagina o creare un elemento.
- **Scorciatoie da tastiera**: premendo `g` e una lettera si salta a una sezione (per esempio `g` `t` per i tornei, `g` `a` per gli associati, `g` `w` per le carte cercate). C'è un tour che le mostra.
- **Tour guidati** nelle pagine principali.
- **Notifiche**: icona con l'elenco degli avvisi.
- **Bot Telegram** [@PauperwaveBot](https://t.me/PauperwaveBot): classifiche, calendario, iscrizioni, risultati ai tavoli, prezzi e carte cercate dalla chat. Vedi [la guida](../telegram-bot/README.md).
- **Mini app turni** (`/telegram/turni`): il contatore dei turni aggiuntivi, aperta dal bot.
- **Feedback e supporto** dal menu della barra laterale.

## Cose ancora in corso

- Il torneo **Cubo Commander** è un formato a tavoli come Commander, ma il suo flusso di round non è ancora collegato a quello di Commander.
- Le **classifiche** del sito e quella della scheda lega usano dati di esempio finché non esiste la tabella dei piazzamenti (vedi [Classifiche](#classifiche)).
- I sottodomini **`pauperwave.org`** e **`blog.`** non servono ancora un sito proprio.
