# SmartPlanner

Pianificazione condivisa di una stanza singola tra due colleghi: notti in stanza, giorni di presenza in ufficio, smart working e verifica del limite mensile del 50%.

L'app è pensata per due persone che lavorano nella stessa città, condividono una stanza e possono fare smart working fino al 50% del mese. Una sola persona può dormire in stanza per notte; la presenza in ufficio viene derivata dalle notti adiacenti.

## Regola principale

Una notte prenotata da una persona il giorno **N** copre la sua presenza:

- il giorno **N** stesso (arrivo in città la mattina);
- il giorno **N + 1** (si sveglia in stanza).

Quindi:

- notti lunedì + martedì → presenza lunedì, martedì, mercoledì;
- la notte di domenica copre la presenza del lunedì;
- un blocco di `k` notti consecutive produce fino a `k + 1` giorni di presenza.

La settimana tipo predefinita è:

| Persona | Notti | Presenza |
|---|---|---|
| A | lunedì, martedì | lunedì, martedì, mercoledì |
| B | mercoledì, giovedì | mercoledì, giovedì, venerdì |

Mercoledì entrambi sono in ufficio: A parte, B arriva. La stanza resta occupata da una sola persona per notte. Questo giorno di passaggio è ciò che permette a entrambi di stare sotto il 50% di smart working in una settimana piena.

## Calcolo del 50%

Per ogni persona e per ogni mese:

- **Giorni eleggibili** = giorni feriali − festivi − assenze collettive − assenze individuali.
- **Presenze** = giorni confermati.
- **Smart working** = giorni eleggibili − presenze.
- **Limite** = `floor(giorni eleggibili × 50%)` con arrotondamento stretto.

Esempio: con 21 giorni eleggibili il massimo è 10 giorni di SW (11 sarebbe 52,4%, fuori limite); servono almeno 11 presenze.

Weekend, festivi e assenze non entrano nel calcolo. Le assenze individuali riducono il denominatore solo della persona interessata; le chiusure aziendali lo riducono per entrambi.

## Funzionalità della Fase 1

- Calendario mensile con notti, presenze proposte, smart working, assenze e festivi.
- Dettaglio giornata con assegnazione notte, conferma/esclusione presenza e gestione eccezioni.
- Settimana tipo modificabile e applicabile al mese o ai prossimi 12 mesi.
- Assenze: ferie, malattia, permesso/ROL, chiusura aziendale.
- Festivi nazionali italiani precompilati (incluso il lunedì dell'Angelo) e festivi personalizzati.
- Riepilogo mensile per persona: giorni eleggibili, presenze, SW, percentuale, margine, notti, eccezioni e notti non sfruttate.
- Avvisi automatici: limite superato, notti non sfruttate, presenze senza notte, notti durante assenze.
- Conferma/riapertura del mese.
- Esportazione JSON dei dati e importazione di un backup.
- Download `.ics` per i calendari personali e per il calendario della stanza.
- Layout responsive: griglia su desktop, agenda giornaliera su mobile.
- Persistenza locale tramite `localStorage`.

## Avvio locale

```bash
npm install
npm run dev
```

Apri l'URL mostrato da Vite (di solito `http://localhost:5173`).

Altri comandi:

```bash
npm test        # test di dominio e smoke test dell'interfaccia
npm run lint    # oxlint
npm run build   # typecheck + build di produzione
npm run preview # anteprima della build
```

## Deploy su GitHub Pages

Il progetto è già configurato con:

- `base: './'` in `vite.config.ts`, compatibile con le project page di GitHub Pages;
- workflow GitHub Actions in `.github/workflows/deploy.yml`.

Procedura:

1. Crea un repository **pubblico** su GitHub (es. `smartplanner`).
2. Carica il progetto sul branch `main`.
3. Nel repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Il workflow parte a ogni push su `main` e pubblica `dist`.
5. L'app sarà su `https://<utente>.github.io/<repository>/`.

I test e il lint vengono eseguiti prima del deploy: se falliscono, il sito non viene aggiornato.

> GitHub Pages gratuito pubblica solo da repository pubblici. Per i dati personali la Fase 2 userà Supabase con login e Row Level Security, quindi il repository potrà restare pubblico senza esporre il calendario.

## Dati e backup

In questa fase i dati sono salvati solo nel browser corrente (`localStorage`). Non c'è ancora sincronizzazione tra i due utenti.

- **Impostazioni → Dati e backup → Esporta JSON** crea un backup completo.
- **Importa JSON** ripristina un backup.
- **Ripristina demo** riporta l'app allo stato iniziale.

## Calendario ICS

La scheda **Calendario ICS** genera tre file:

- calendario personale di A;
- calendario personale di B;
- calendario della stanza (solo pernottamenti).

Il download copre i prossimi 12 mesi a partire dal mese visualizzato. Gli eventi sono giornalieri e non bloccano gli orari. I mesi senza notti, assenze o piano confermato esportano solo le presenze esplicite.

Per Google Calendar: **Impostazioni → Importa ed esporta → Importa**, seleziona il file `.ics` e il calendario di destinazione. Il file è un'istantanea: dopo una modifica va riscaricato e reimportato. Il feed in abbonamento con aggiornamento automatico arriverà con Supabase Edge Functions.

## Struttura del progetto

```text
src/
  components/
    calendar/     calendario, agenda mobile, dettaglio giorno, avvisi
    layout/       header, tab, footer
    summary/      riepiloghi per persona e per mese
    ui/           componenti base (button, card, modal, switch…)
  hooks/
    usePlanner.ts stato applicativo e azioni
  lib/
    domain/       regole di dominio, date, festivi, metriche, ICS
    storage.ts    persistenza locale e backup
  pages/          calendario, settimana tipo, assenze, ICS, impostazioni
  test/           setup dei test
```

La logica di dominio è separata dall'interfaccia ed è coperta da test:

- copertura delle presenze da notti adiacenti;
- notte di domenica → lunedì;
- una persona per notte;
- sincronizzazione delle presenze automatiche;
- settimana tipo e giorno di passaggio;
- calcolo stretto del 50%;
- assenze individuali/collettive, festivi e weekend;
- eccezioni, notti non sfruttate e notti a cavallo del mese;
- conferma/riapertura del mese;
- generazione ICS, escaping e feed stanza.

## Prossime fasi

- **Fase 2 — Supabase:** login email/password, database condiviso, RLS, realtime e sostituzione di `localStorage` con un repository Supabase.
- **Fase 3 — Deploy:** pubblicazione GitHub Pages (workflow già pronto).
- **Fase 4 — Feed ICS in abbonamento:** Edge Function Supabase con token per i tre feed, aggiornamento automatico in Google Calendar.
- **Fase 5 — Rifiniture:** export CSV, auto-proposta del piano, PWA, notifiche.

## Note

- La Fase 1 non è multi-dispositivo: ogni browser ha i propri dati. Usa l'export JSON per spostarli.
- Il token del feed ICS e i segreti Supabase non dovranno mai essere committati nel repository.
- I test usano una data deterministica (novembre 2026) per verificare il modello.
