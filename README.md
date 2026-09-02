# LiverFailure

Ricettario di drink condiviso, fatto con React + Vite e Firebase (Auth + Firestore).

## Cosa fa

- Sfoglia la libreria pubblica di drink (`/explore`), con ricerca, filtri per alcolico e ordinamento per data o per voto medio
- Crea, modifica ed elimina le tue ricette (`/my-drinks`)
- Salva i drink nei preferiti, disponibili anche offline
- Vota e recensisci i drink degli altri: una recensione a testa per drink, con media e numero di voti su card e dettaglio
- "Consigliati per te" in home: drink pubblici scelti in base agli ingredienti dei tuoi preferiti
- Dispensa personale (`/inventory`): segni cosa hai in casa e ogni drink ti dice se lo puoi fare ora o cosa ti manca, con lista della spesa scalabile per N persone
- Modalità festa (`/party`): uno fa da bar, gli altri ordinano dal telefono, con coda ordini in tempo reale e inventario condiviso che si scala da solo
- Profilo utente con foto e password modificabili

I preferiti, i tuoi drink e la dispensa vengono anche tenuti in cache in `localStorage`, così restano leggibili senza connessione.

## Modello dati

| Collection | Cosa contiene | Chi scrive |
| --- | --- | --- |
| `drinks/{id}` | La ricetta | L'autore |
| `drinks/{id}/reviews/{uid}` | Voto 1-5 e commento; l'id documento è l'uid, quindi una recensione a testa | Chi recensisce (mai l'autore del drink) |
| `drinkRatings/{drinkId}` | `ratingTotal` (somma dei voti) e `ratingCount` | Chiunque recensisca, ma solo in transazione insieme alla propria recensione |
| `users/{uid}` | Foto profilo e `inventory` (la dispensa) | Il proprietario |
| `users/{uid}/favorites/{drinkId}` | Preferiti | Il proprietario |
| `partySessions/{codice}` | La festa; l'id documento **è** il codice da condividere | L'host |
| `partySessions/{codice}/participants/{uid}` | `displayName`, `role` (`bar` o `cliente`) | Ci si aggiunge da soli come cliente, il ruolo bar lo dà l'host |
| `partySessions/{codice}/orders/{id}` | Ordine e stato (`in coda`, `in preparazione`, `pronto`, `annullato`) | Il cliente lo crea, il bar lo fa avanzare |
| `partySessions/{codice}/inventory/current` | Millilitri per bottiglia + extra disponibili | Solo chi ha ruolo `bar` |

Due scelte che vale la pena spiegare:

- **La media voti sta in una collection separata** perché la regola `update` su `drinks/{id}` richiede di essere l'autore: se l'aggregato stesse dentro il documento del drink, per aggiornarlo bisognerebbe indebolire quella regola.
- **L'aggregato tiene la somma dei voti, non la media.** È la differenza tra un numero verificabile e uno di cui fidarsi: con la somma le regole controllano l'equazione esatta (`totale dopo == totale prima − voto vecchio + voto nuovo`), mentre una media sarebbe un valore arbitrario che chiunque abbia già recensito quel drink potrebbe sovrascrivere. Il vincolo è simmetrico: la recensione non si scrive senza muovere l'aggregato, e l'aggregato non si muove senza scrivere la recensione. La media si calcola a video con `averageOf()`.
- **Il codice della festa è l'id del documento**, così chi ha il codice legge quel singolo documento (`get`) ma nessuno può elencare le feste degli altri (`list` è negato, tranne che per le proprie).

Non c'è push cross-dispositivo: le notifiche restano quelle locali di `utils/notifications.js` (il "drink pronto" arriva quando la scheda del cliente è aperta e riceve l'aggiornamento da `onSnapshot`). Aggiungerlo richiederebbe FCM più una Cloud Function, che oggi il progetto non ha.

## Sviluppo

```bash
npm install
npm run dev
npm test     # test delle utility pure, node --test
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
