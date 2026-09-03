# LiverFailure

Ricettario di drink condiviso, fatto con React + Vite e Firebase (Auth + Firestore).
Progetto sviluppato per l'esame universitario.

## Indice

- [Come avviarla in 2 minuti](#come-avviarla-in-2-minuti)
- [Requisiti della traccia d'esame](#requisiti-della-traccia-desame)
- [Cosa fa](#cosa-fa)
- [Modello dati](#modello-dati)
- [Sviluppo](#sviluppo)
- [Stack](#stack)
- [Altra documentazione](#altra-documentazione)

## Come avviarla in 2 minuti

Il file `.env` con le credenziali del progetto Firebase (Auth + Firestore) è già incluso
in questa cartella, quindi non serve creare o configurare nulla: bastano Node.js e npm
installati.

```bash
npm install
npm run dev
```

Il terminale stampa un indirizzo locale (es. `http://localhost:5173`): apritelo nel
browser, l'app è pronta all'uso con dati reali (Firebase è già collegato). Per provarla
basta registrare un utente da "Registrati" con una qualsiasi email/password.

Per andare online e hostre la webapp cosi che anche da altri dispositivi ci si possa accedere invece
occorre un comando diverso al posto diverso da npm install
```bash
npm run online
```
**il progetto è gia online al link: https://liverfailure-b0032.web.app/** sfruttando l'hosting fornito da firebase
## Requisiti della traccia d'esame

Riepilogo di come il progetto soddisfa ogni punto richiesto, con un rimando ai file dove
guardare il codice corrispondente.

| Requisito | Come è soddisfatto |
| --- | --- |
| **Front-end con un framework a scelta** | React 19 + Vite, con React Router per le pagine. Codice in `src/`. |
| **Gestione dell'autenticazione utenti** | Firebase Authentication (email/password). Login e registrazione in `src/pages/Login.jsx` e `Register.jsx`, stato utente globale in `src/context/AuthContext.jsx`; le pagine che richiedono login (My Drinks, Favorites, Profile, Create/Edit Drink, Inventory, Party) sono chiuse dietro `src/components/ProtectedRoute.jsx`. |
| **Comunicazione con una API esterna (REST e/o Firestore)** | Backend Firestore: ogni lettura/scrittura (drink, recensioni, preferiti, dispensa, sessioni festa) passa dall'SDK Firebase nei moduli `src/firebase/*.js`, con permessi imposti da `firestore.rules`. |
| **PWA – installabile** | Manifest generato da `vite-plugin-pwa` (configurato in `vite.config.js`), icone in `public/`; da Chrome/Edge compare il prompt "Installa app". |
| **PWA – offline / fallback offline** | Il service worker (generato automaticamente in build, vedi `dist/sw.js`) mette in cache l'intera app e la serve anche senza rete (fallback a `index.html` per qualunque navigazione). I dati già visti (drink, preferiti, dispensa) restano leggibili offline perché duplicati in `localStorage` (`src/utils/localCache.js` e utility collegate), con avviso "Sei offline" nelle pagine coinvolte. |
| **PWA – notifiche (iOS escluso)** | `src/utils/notifications.js` usa la Notification API tramite service worker (con fallback al costruttore `Notification` su desktop): notifica alla creazione di un drink e quando in Modalità Festa un ordine passa a "pronto". |
| **Repository pubblico versionato** | Codice su GitHub: <https://github.com/iperlion44/liverfailure>. |
| **Algoritmo di matching dall'inventario** | L'utente segna gli ingredienti che possiede (`src/pages/Inventory.jsx`); `src/utils/inventoryMatch.js` confronta l'inventario con gli ingredienti di ogni drink e lo classifica come "puoi farlo ora" o "ti manca(no) N ingrediente/i". Per i drink quasi pronti, `src/utils/quantityScale.js` genera la lista della spesa con le dosi scalate per N persone (selettore in `src/pages/DrinkDetails.jsx`). |
| **Modalità Festa in tempo reale (ruoli bar/cliente)** | `src/firebase/party.js` + `src/pages/Party.jsx`/`PartyRoom.jsx`: si crea una sessione con un codice condivisibile; l'host è `bar`, chi entra col codice è `cliente`. Il menu ordinabile è calcolato con lo stesso matching dell'inventario applicato alle scorte condivise della festa; la coda ordini si aggiorna in tempo reale via `onSnapshot`, e quando il bar segna un ordine "pronto" gli ingredienti vengono scalati dall'inventario condiviso dentro una transazione Firestore (evita che due bartender svuotino in negativo la stessa bottiglia). |
| **Recensioni dei drink** | Una recensione per utente per drink (`drinks/{id}/reviews/{uid}`, id documento = uid così il vincolo "una a testa" è strutturale); media e conteggio voti in `drinkRatings/{drinkId}`, aggiornati in transazione insieme alla recensione. UI in `src/components/ReviewSection.jsx`, con media mostrata su card ed Explore ordinabile per voto. |
| **Consigliati in base ai preferiti** | `src/utils/recommendations.js` calcola, per ogni drink pubblico non ancora tra i preferiti, un punteggio di similarità sugli ingredienti in comune con i preferiti dell'utente (alcolici pesati di più), con la media voti come boost secondario; i risultati migliori appaiono nella sezione "Consigliati per te" (`src/components/Recommendations.jsx`). |

## Cosa fa

- Sfoglia la libreria pubblica di drink (`/explore`), con ricerca, filtri per alcolico e ordinamento per data o per voto medio
- Crea, modifica ed elimina le tue ricette (`/my-drinks`)
- Salva i drink nei preferiti, disponibili anche offline
- Vota e recensisci i drink degli altri: una recensione a testa per drink, con media e numero di voti su card e dettaglio
- "Consigliati per te" in home: drink pubblici scelti in base agli ingredienti dei tuoi preferiti
- Dispensa personale (`/inventory`): segni cosa hai in casa e ogni drink ti dice se lo puoi fare ora o cosa ti manca, con lista della spesa scalabile per N persone
- Modalità festa (`/party`): uno fa da bar, gli altri ordinano dal telefono, con coda ordini in tempo reale e inventario condiviso che si scala da solo
- Nel menù della festa ci puoi mettere anche una tua ricetta privata: alla festa la vedono, la aprono e la ordinano tutti come le altre, ma in Esplora resta invisibile. Il permesso vale finché il drink è in quel menù e tu sei in quella festa
- Scheda "Spesa" (solo a festa ferma): dato il menù scelto e le persone attese, dice quanto serve di ogni ingrediente perché ognuno possa ordinare almeno una volta ogni drink, già al netto di quello che c'è sul bancone. Si spunta come una lista della spesa vera — la riga presa si barra e resta al suo posto, e finisce sul bancone con la quantità che serve
- Profilo utente con foto e password modificabili
- PWA installabile e utilizzabile offline (manifest, service worker, dati in cache locale)

I preferiti, i tuoi drink e la dispensa vengono anche tenuti in cache in `localStorage`, così restano leggibili senza connessione.

Tutta l'interfaccia è in italiano; è una scelta di prodotto, non un dettaglio lasciato a metà (vedi [`../PRODUCT.md`](../PRODUCT.md)).

## Modello dati

| Collection | Cosa contiene | Chi scrive |
| --- | --- | --- |
| `drinks/{id}` | La ricetta; `partyCodes` elenca le feste in cui l'autore ha messo un drink privato | L'autore |
| `drinks/{id}/reviews/{uid}` | Voto 1-5 e commento; l'id documento è l'uid, quindi una recensione a testa | Chi recensisce (mai l'autore del drink) |
| `drinkRatings/{drinkId}` | `ratingTotal` (somma dei voti) e `ratingCount` | Chiunque recensisca, ma solo in transazione insieme alla propria recensione |
| `users/{uid}` | Foto profilo e `inventory` (la dispensa) | Il proprietario |
| `users/{uid}/favorites/{drinkId}` | Preferiti | Il proprietario |
| `partySessions/{codice}` | La festa; l'id documento **è** il codice da condividere | L'host |
| `partySessions/{codice}/participants/{uid}` | `displayName`, `role` (`bar` o `cliente`) | Ci si aggiunge da soli come cliente, il ruolo bar lo dà l'host |
| `partySessions/{codice}/orders/{id}` | Ordine e stato (`in coda`, `in preparazione`, `pronto`, `annullato`) | Il cliente lo crea, il bar lo fa avanzare |
| `partySessions/{codice}/inventory/current` | Millilitri per bottiglia + extra disponibili | Solo chi ha ruolo `bar` |

## Sviluppo

```bash
npm install
npm run dev
npm run lint
```

Serve un progetto Firebase con Auth (email/password) e Firestore attivi; la configurazione va in `src/firebase/firebaseconfig.js` (o nelle relative variabili d'ambiente).

Regole e indici si pubblicano con la CLI di Firebase:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Gli indici nuovi servono per le feste che ho aperto io (`partySessions` su `hostId` + `createdAt`) e per ritrovare le proprie recensioni quando si elimina il profilo (query di gruppo su `reviews.authorId`).

## Stack

- React 19 + Vite
- React Router
- Firebase (Auth, Firestore)
- CSS puro (nessun framework), font Bodoni Moda / Schibsted Grotesk / DM Mono

## Utilizzo dell'AI

Nello sviluppo del progetto è stato usato un assistente AI (Claude Code) come supporto per:

- Revisione di codice (componenti React, pagine, logica applicativa e utility)
- Aiuto nella configurazione di strumenti e servizi (Firebase, PWA, build/deploy)
- Debug e correzione di problemi riscontrati durante lo sviluppo
- Stesura e revisione della documentazione (questo README incluso)
- Commenti del codice
- Divisione in parti con scopi diversi del CSS
- Scrittura del codice CSS e scelte stilistiche dell'applicazione

Claude AI è stata utilizzata anche una volta per caricare il progetto su github. Non è stato possibile levarlo dai coautori

Le scelte di prodotto, l'architettura generale e le decisioni finali restano comunque a cura dello sviluppatore.

La scrittura del codice che riguarda lo stile dell webapp (CSS) è basata sulla scrittura della pagina home
creata dallo sviluppatore e poi lo stesso stile è stato riutilizzato come base dall'assistente AI per le altre pagine

Per imparare ad utilizzare ed interagire con Firebase è stata invece utilizzata l'AI Gemini