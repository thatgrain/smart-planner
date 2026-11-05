# SmartPlanner

Pianificazione condivisa di una stanza singola tra due colleghi: notti in stanza, giorni di presenza in ufficio, smart working e verifica del limite mensile del 50%.

L'app è pensata per due persone che lavorano nella stessa città, condividono una stanza e possono fare smart working fino al 50% del mese. Una sola persona può dormire in stanza per notte; la presenza in ufficio viene derivata dalle notti adiacenti.

La Fase 2 aggiunge **Supabase**: login, database condiviso e sincronizzazione in tempo reale tra i due browser.

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
| Grano | lunedì, martedì | lunedì, martedì, mercoledì |
| Pietro | mercoledì, giovedì | mercoledì, giovedì, venerdì |

Mercoledì entrambi sono in ufficio: Grano parte, Pietro arriva. La stanza resta occupata da una sola persona per notte. Questo giorno di passaggio è ciò che permette a entrambi di stare sotto il 50% di smart working in una settimana piena.

## Calcolo del 50%

Per ogni persona e per ogni mese:

- **Giorni eleggibili** = giorni feriali − festivi − assenze collettive − assenze individuali.
- **Presenze** = giorni confermati.
- **Smart working** = giorni eleggibili − presenze.
- **Limite** = `floor(giorni eleggibili × 50%)` con arrotondamento stretto.

Esempio: con 21 giorni eleggibili il massimo è 10 giorni di SW (11 sarebbe 52,4%, fuori limite); servono almeno 11 presenze.

Weekend, festivi e assenze non entrano nel calcolo. Le assenze individuali riducono il denominatore solo della persona interessata; le chiusure aziendali lo riducono per entrambi.

## Funzionalità

- Calendario mensile con notti, presenze proposte, smart working, assenze e festivi.
- Dettaglio giornata con assegnazione notte, conferma/esclusione presenza e gestione eccezioni.
- Settimana tipo modificabile e applicabile al mese o ai prossimi 12 mesi.
- Assenze: ferie, malattia, permesso/ROL, chiusura aziendale.
- Festivi nazionali italiani precompilati (incluso il lunedì dell'Angelo) e festivi personalizzati.
- Riepilogo mensile per persona: giorni eleggibili, presenze, SW, percentuale, margine, notti, eccezioni e notti non sfruttate.
- Avvisi automatici: limite superato, notti non sfruttate, presenze senza notte, notti durante assenze.
- Conferma/riapertura del mese.
- Login email/password con Supabase Auth.
- Database condiviso con Row Level Security e allowlist delle due email.
- Sincronizzazione realtime tra i due browser.
- Salvataggio locale di cache/backup e esportazione/importazione JSON.
- Download `.ics` per i calendari personali e per il calendario della stanza.
- Layout responsive: griglia su desktop, agenda giornaliera su mobile.

## Avvio locale

```bash
npm install
npm run dev
```

Apri l'URL mostrato da Vite (di solito `http://localhost:5173`).

Crea un file `.env.local` (già ignorato da git):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key>
```

Senza queste variabili l'app funziona in **modalità locale** con `localStorage`, come nella Fase 1.

Altri comandi:

```bash
npm test        # test di dominio, bootstrap cloud e smoke test UI
npm run lint    # oxlint
npm run build   # typecheck + build di produzione
npm run preview # anteprima della build
```

## Configurazione Supabase

### 1. Progetto

Crea un progetto gratuito su [supabase.com](https://supabase.com/dashboard), preferibilmente in regione EU (es. Frankfurt `eu-central-1`).

### 2. Database

Apri il **SQL Editor**, incolla il contenuto di:

```text
supabase/migrations/0001_init.sql
```

e premi **Run**.

La migrazione crea:

- `public.planner_state`: un unico record JSONB con tutto lo stato dell'app;
- RLS con allowlist delle email `massimiliano.granello@gmail.com` e `pietro.cargnel26@gmail.com`;
- trigger automatico `updated_at` / `updated_by`;
- `replica identity full` e Realtime sulla tabella.

### 3. Utenti

In **Authentication → Users → Add user → Create new user** crea i due account:

- `massimiliano.granello@gmail.com`
- `pietro.cargnel26@gmail.com`

Attiva **Auto Confirm User** per entrambi. Poi, in **Authentication → Providers → Email**, disabilita **Allow new users to sign up**.

Le password le scelgono gli utenti e non vengono mai salvate nel repository.

### 4. Variabili frontend

In locale: `.env.local` come sopra.

Su GitHub Pages il workflow passa già le credenziali publishable durante la build. Se preferisci gestirle come variabili del repository, crea in **Settings → Secrets and variables → Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

e sostituisci i valori hardcoded nel workflow con `${{ vars.VITE_SUPABASE_URL }}` e `${{ vars.VITE_SUPABASE_ANON_KEY }}`.

> La publishable key è pensata per essere pubblica nel bundle. La `service_role`/`secret key` non viene mai usata dal frontend.

## Primo accesso e sincronizzazione

Al primo login:

- se il cloud è vuoto, l'app carica il piano locale presente nel browser (o crea lo stato iniziale);
- se il cloud contiene già un piano e il browser ha un piano locale diverso, viene mostrata una scelta: **usa il piano cloud** oppure **carica il piano locale**;
- dopo la scelta, il cloud diventa la fonte di verità e il browser ne mantiene una cache locale.

Le modifiche vengono salvate con un debounce di circa 450 ms e propagate all'altro browser via Realtime. In caso di errore di salvataggio, l'app avvisa e mantiene le modifiche in locale; il pulsante **Sincronizza ora** riprova.

## Deploy su GitHub Pages

Il progetto è già configurato con:

- `base: './'` in `vite.config.ts`, compatibile con le project page di GitHub Pages;
- workflow GitHub Actions in `.github/workflows/deploy.yml` (Node 24, Ubuntu 24.04, azioni aggiornate).

Procedura:

1. Crea un repository **pubblico** su GitHub.
2. Carica il progetto sul branch `main`.
3. Nel repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Il workflow parte a ogni push su `main` e pubblica `dist`.
5. L'app sarà su `https://<utente>.github.io/<repository>/`.

I test e il lint vengono eseguiti prima del deploy: se falliscono, il sito non viene aggiornato.

## Calendario ICS

La scheda **Calendario ICS** genera tre file:

- calendario personale di Grano;
- calendario personale di Pietro;
- calendario della stanza (solo pernottamenti).

Il download copre i prossimi 12 mesi a partire dal mese visualizzato. Gli eventi sono giornalieri e non bloccano gli orari. I mesi senza notti, assenze o piano confermato esportano solo le presenze esplicite.

Per Google Calendar: **Impostazioni → Importa ed esporta → Importa**, seleziona il file `.ics` e il calendario di destinazione. Il file è un'istantanea: dopo una modifica va riscaricato e reimportato. Il feed in abbonamento con aggiornamento automatico arriverà con Supabase Edge Functions.

## Backup

- **Impostazioni → Dati e backup → Esporta JSON** crea un backup completo.
- **Importa JSON** ripristina un backup. In modalità cloud il piano condiviso viene sostituito per entrambi.
- **Ripristina demo** riporta l'app allo stato iniziale.

## Struttura del progetto

```text
src/
  components/
    calendar/     calendario, agenda mobile, dettaglio giorno, avvisi
    cloud/        login, loading, errore, conflitto locale/cloud
    layout/       header, tab, footer
    summary/      riepiloghi per persona e per mese
    ui/           componenti base (button, card, modal, switch…)
  hooks/
    usePlanner.ts stato applicativo, cloud sync e azioni
  lib/
    cloud.ts          client Supabase, load/save/realtime, errori
    cloud-bootstrap.ts scelta locale/cloud al primo accesso
    domain/           regole di dominio, date, festivi, metriche, ICS
    storage.ts        persistenza locale, validazione e backup
    supabase.ts       inizializzazione client
  pages/          calendario, settimana tipo, assenze, ICS, impostazioni
  test/           setup dei test
supabase/
  migrations/     0001_init.sql
```

## Test

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
- generazione ICS, escaping e feed stanza;
- decisione di bootstrap locale/cloud.

## Sicurezza e privacy

- Il sito è pubblico, ma i dati sono accessibili solo dopo login.
- RLS e allowlist limitano lettura/scrittura alle due email configurate.
- La publishable key è pubblica per design; la secret key non è nel frontend.
- Il backup JSON e il token ICS (in una fase futura) vanno trattati come dati personali.
- Supabase Free mette in pausa i progetti dopo 7 giorni di inattività; con l'uso quotidiano non è un problema.

## Prossime fasi

- **Fase 4 — Feed ICS in abbonamento:** Edge Function Supabase con token per i tre feed, aggiornamento automatico in Google Calendar.
- **Fase 5 — Rifiniture:** export CSV, auto-proposta del piano, PWA, notifiche.
