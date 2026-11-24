# La mia wishlist

Una lista dei desideri: chi ti fa un regalo vede cosa vorresti, dove comprarlo e può segnare «Lo prendo io».

## Avviarla sul computer

```powershell
npm install
npm run dev
```

Poi apri http://localhost:5173 nel browser.

- Lista: `http://localhost:5173/#/`
- Area riservata per aggiungere desideri: `http://localhost:5173/#/admin`

## Dove si cambia cosa

- `src/config.js`: il tuo nome, il titolo, le categorie, i filtri e i nomi delle stelle.
- `src/styles.css`: colori e stile.
- `src/store.js`: dove vengono salvati i desideri.

## Stato attuale

Per ora i desideri, gli oggetti già presi e i promemoria vengono salvati **solo nel browser di chi apre il sito**.
Il passo successivo è collegare un database condiviso (Supabase) per:

- far vedere a tutti gli stessi desideri e lo stato «Già preso»;
- proteggere l'area riservata con una password;
- inviare davvero le email di promemoria.
