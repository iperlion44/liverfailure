# LiverFailure

Ricettario di drink condiviso, fatto con React + Vite e Firebase (Auth + Firestore).

## Cosa fa

- Sfoglia la libreria pubblica di drink (`/explore`), con ricerca e filtri per alcolico
- Crea, modifica ed elimina le tue ricette (`/my-drinks`)
- Salva i drink nei preferiti, disponibili anche offline
- Profilo utente con foto e password modificabili

I preferiti e i tuoi drink vengono anche tenuti in cache in `localStorage`, così restano leggibili senza connessione.

## Sviluppo

```bash
npm install
npm run dev
```

Serve un progetto Firebase con Auth (email/password) e Firestore attivi; la configurazione va in `src/firebase/firebaseconfig.js` (o nelle relative variabili d'ambiente).

## Stack

- React 19 + Vite
- React Router
- Firebase (Auth, Firestore)
- CSS puro (nessun framework), font Bodoni Moda / Schibsted Grotesk / DM Mono
