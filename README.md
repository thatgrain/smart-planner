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
- Giorni del mese precedente e successivo visibili ma attenuati e in sola lettura: un click porta al mese corretto.
- Numero della settimana ISO (WK) nella griglia e nell'agenda mobile.
- Dettaglio giornata con assegnazione notte, conferma/esclusione presenza e gestione eccezioni.
- Settimana tipo modificabile e applicabile al mese o ai prossimi 12 mesi.
- Assenze: ferie, malattia, permesso/ROL, chiusura aziendale, con modifica dei periodi già registrati.
- Campi data in formato italiano `gg/mm/aaaa`, con calendario che inizia il lunedì.
- Festivi nazionali italiani precompilati (incluso il lunedì dell'Angelo) e festivi personalizzati.
- Riepilogo mensile per persona: giorni eleggibili, presenze, SW, percentuale, margine, notti, eccezioni e notti non sfruttate.
- Avvisi automatici: limite superato, notti non sfruttate, presenze senza notte, notti durante assenze.
- Novità in-app: riepilogo delle modifiche fatte dall'altra persona dall'ultimo accesso, con banner, campanella e dettaglio per categoria.
- Login email/password con Supabase Auth.
- Database condiviso con Row Level Security e allowlist delle due email.
- Sincronizzazione realtime tra i due browser.
- Salvataggio locale di cache/backup e esportazione/importazione JSON.
- Download `.ics` e feed ICS in abbonamento con token rigenerabile.
- PWA installabile su Android e iPhone, con icona, schermo intero e cache dell'app.
- Consultazione offline in sola lettura dell'ultimo piano salvato.
- Layout mobile semplificato: riepilogo compatto, calendario subito visibile e dettagli espandibili.
- Tema chiaro, scuro o automatico dal sistema, con preferenza per dispositivo.
- Cambio password dal pannello Sicurezza, con verifica della password attuale.

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

Senza queste variabili l'app funziona in **modalità locale** con `localStorage`.

Altri comandi:

```bash
npm test        # dominio, cloud, UI, tema, password, feed ICS
npm run lint    # oxlint
npm run build   # typecheck + build di produzione
npm run preview # anteprima della build
```

Manifest e service worker vengono generati solo con `npm run build`; in sviluppo il service worker è disattivato per evitare cache indesiderate.

## Configurazione Supabase

### 1. Progetto

Crea un progetto gratuito su [supabase.com](https://supabase.com/dashboard), preferibilmente in regione EU (es. Frankfurt `eu-central-1`).

### 2. Database

Apri il **SQL Editor** ed esegui, nell'ordine:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_feed_tokens.sql
```

La prima migrazione crea:

- `public.planner_state`: un unico record JSONB con tutto lo stato dell'app;
- RLS con allowlist delle email `massimiliano.granello@gmail.com` e `pietro.cargnel26@gmail.com`;
- trigger automatico `updated_at` / `updated_by`;
- `replica identity full` e Realtime sulla tabella.

La seconda crea `public.feed_tokens`, con i token iniziali dei tre feed ICS e le policy RLS.

### 3. Utenti

In **Authentication → Users → Add user → Create new user** crea i due account:

- `massimiliano.granello@gmail.com`
- `pietro.cargnel26@gmail.com`

Attiva **Auto Confirm User** per entrambi. Poi, in **Authentication → Providers → Email**, disabilita **Allow new users to sign up**.

Le password le scelgono gli utenti e non vengono mai salvate nel repository. Il cambio password è disponibile dall'app in **Impostazioni → Sicurezza**.

### 4. Variabili frontend

In locale: `.env.local` come sopra.

Su GitHub Pages il workflow passa già le credenziali publishable durante la build. Se preferisci gestirle come variabili del repository, crea in **Settings → Secrets and variables → Actions → Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

e sostituisci i valori hardcoded nel workflow con `${{ vars.VITE_SUPABASE_URL }}` e `${{ vars.VITE_SUPABASE_ANON_KEY }}`.

> La publishable key è pensata per essere pubblica nel bundle. La `service_role`/`secret key` non viene mai usata dal frontend.

### 5. Edge Function del feed ICS

Il feed in abbonamento è servito dalla function `ics` in `supabase/functions/ics`. Va deployata una volta sola:

```bash
npx supabase login
npx supabase functions deploy ics --remote=hbmoikaemsyqqmwnnbst --no-verify-jwt --use-api
```

`--use-api` evita di richiedere Docker per il bundling.

In alternativa, dal repository GitHub: **Actions → Deploy Supabase Function → Run workflow**. Serve prima aggiungere il secret `SUPABASE_ACCESS_TOKEN` in **Settings → Secrets and variables → Actions**.

La function:

- è pubblica ma protetta dal token nell'URL;
- legge `feed_tokens` e `planner_state` con la service role key iniettata da Supabase;
- restituisce un calendario `text/calendar` aggiornato;
- non richiede JWT perché Google Calendar non può inviarlo.

Se la function non è deployata, l'anteprima del feed restituisce `404`.

## Primo accesso e sincronizzazione

Al primo login:

- se il cloud è vuoto, l'app carica il piano locale presente nel browser (o crea lo stato iniziale);
- se il cloud contiene già un piano e il browser ha un piano locale diverso, viene mostrata una scelta: **usa il piano cloud** oppure **carica il piano locale**;
- dopo la scelta, il cloud diventa la fonte di verità e il browser ne mantiene una cache locale.

Le modifiche vengono salvate con un debounce di circa 450 ms e propagate all'altro browser via Realtime. In caso di errore di salvataggio, l'app avvisa e mantiene le modifiche in locale; **Sincronizza ora** riprova.

## Novità in-app

L'app mostra le modifiche fatte dall'altra persona dall'ultimo accesso senza usare servizi esterni (niente email, Web Push o Brevo).

- A ogni modifica locale viene aggiornata una fotografia del piano in `localStorage`, separata per utente e per dispositivo (`smartplanner.lastSeen.v1.<project>.<email>`).
- All'apertura, la fotografia precedente viene confrontata con il piano cloud: le differenze diventano un banner **Novità** con il conteggio per categoria.
- La campanella nell'header riapre il riepilogo; il pulsante **Mostra** apre il dettaglio di notti, presenze manuali, assenze, festivi, settimana tipo, profili e impostazioni.
- Se una modifica remota arriva mentre l'app è visibile, compare un toast e la novità è considerata già vista. Se arriva a scheda nascosta, resta non letta fino alla riapertura.
- La fotografia è solo un riferimento locale: il cloud resta l'unica fonte di verità. Svuotare i dati del sito azzera anche lo storico delle novità.
- Non vengono inviate notifiche quando l'app è chiusa: è una scelta voluta per evitare servizi esterni e costi aggiuntivi.

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

Test e lint vengono eseguiti prima del deploy: se falliscono, il sito non viene aggiornato.

## PWA e mobile

L'app è una **Progressive Web App** generata con `vite-plugin-pwa`.

### Installazione

- **Android / Chrome:** menu del browser → **Installa app**; su mobile compare anche un banner dedicato.
- **iPhone / Safari:** **Condividi → Aggiungi alla schermata Home**.

La PWA si apre a schermo intero, con icona, tema e splash screen. La card **App sul telefono** in Impostazioni mostra lo stato e le istruzioni.

### Offline

Il service worker precarica l'app shell e non mette mai in cache le chiamate a Supabase. Se apri l'app senza rete:

- viene mostrato l'ultimo piano salvato in `localStorage`;
- l'agenda è in **sola lettura**;
- un banner indica la modalità offline;
- **Riprova** e il ritorno della connessione riattivano la sincronizzazione.

### Home mobile

Sopra il calendario resta solo una striscia compatta con:

- smart working e presenze di Grano e Pietro;
- stato del limite;
- avvisi;
- separatori **WK** per settimana ISO;
- pulsante **Dettagli**.

Le card complete, gli avvisi estesi, la legenda e le note didattiche sono disponibili dietro **Dettagli** o restano visibili su desktop.

## Tema e sicurezza

### Tema

Il tema può essere **Sistema**, **Chiaro** o **Scuro**:

- icona sole/luna nell'header per il cambio rapido;
- controllo completo in **Impostazioni → Aspetto**;
- preferenza salvata solo nel browser (`localStorage`), non condivisa nel cloud;
- script inline in `index.html` per evitare il flash del tema chiaro all'avvio.

### Cambio password

In **Impostazioni → Sicurezza** è possibile cambiare la password:

1. inserisci la password attuale;
2. scegli la nuova password (minimo 8 caratteri);
3. confermala.

L'app verifica la password attuale con Supabase, poi usa `supabase.auth.updateUser({ password })`. La password è gestita da Supabase e non viene mai salvata in chiaro da SmartPlanner. Il form è disabilitato offline e nascosto in modalità locale.

Se una password viene dimenticata, l'amministratore può reimpostarla dalla dashboard Supabase (**Authentication → Users**) o tramite la Admin API con la service role key.

## Calendario ICS

La scheda **Calendario ICS** offre due modalità per tre calendari:

- personale di Grano;
- personale di Pietro;
- stanza (solo pernottamenti).

### Feed in abbonamento

Ogni calendario ha un URL segreto generato da Supabase e servito dalla Edge Function `ics`. In Google Calendar:

1. **Altri calendari → + → Da URL**
2. incolla l'URL del feed;
3. **Aggiungi calendario**.

Google Calendar aggiorna il feed ogni 12–24 ore. Per forzare l'aggiornamento si può rimuovere e riaggiungere il calendario con `#2` in fondo all'URL.

Il pulsante **Rigenera** cambia il token: il vecchio URL smette di funzionare e va sostituito in Google Calendar. L'URL contiene un token segreto: non condividerlo.

### Download `.ics`

Il download copre i prossimi 12 mesi a partire dal mese visualizzato. Gli eventi sono giornalieri e non bloccano gli orari. Per Google Calendar: **Impostazioni → Importa ed esporta → Importa**, seleziona il file `.ics` e il calendario di destinazione. Il file è un'istantanea: dopo una modifica va riscaricato e reimportato.

In entrambi i casi, i mesi senza notti o assenze esportano solo le presenze esplicite.

## Backup

- **Impostazioni → Dati e backup → Esporta JSON** crea un backup completo.
- **Importa JSON** ripristina un backup. In modalità cloud il piano condiviso viene sostituito per entrambi.
- **Ripristina demo** riporta l'app allo stato iniziale.

## Struttura del progetto

```text
src/
  components/
    account/      cambio password
    calendar/     calendario, agenda mobile, dettaglio giorno, avvisi
    cloud/        login, loading, errore, conflitto locale/cloud
    layout/       header, tab, footer
    notifications/ banner, modale e toast delle novità
    pwa/          banner e card di installazione
    settings/     scelta tema
    summary/      riepiloghi per persona e per mese
    ui/           componenti base (button, card, modal, switch…)
  hooks/
    usePlanner.ts stato applicativo, cloud sync e azioni
    usePwaInstall.ts prompt di installazione e stato standalone
    useTheme.tsx  tema sistema/chiaro/scuro
  lib/
    cloud.ts          client Supabase, load/save/realtime, errori
    cloud-bootstrap.ts scelta locale/cloud al primo accesso
    lastSeen.ts       fotografia locale per le novità
    domain/           regole di dominio, date, festivi, metriche, ICS, diff
    storage.ts        persistenza locale, validazione e backup
    supabase.ts       inizializzazione client
  pages/          calendario, offline, settimana tipo, assenze, ICS, impostazioni
  test/           setup dei test
public/           icone PWA, apple-touch-icon, favicon
supabase/
  config.toml
  migrations/     0001_init.sql, 0002_feed_tokens.sql
  functions/
    ics/          index.ts, calendar.ts
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
- modifica di un'assenza esistente con ricalcolo dei giorni eleggibili;
- formato data italiano, validazione e calendario lunedì-first;
- settimane ISO e giorni adiacenti nella griglia del mese;
- eccezioni, notti non sfruttate e notti a cavallo del mese;
- diff delle novità per notti, presenze manuali, assenze, festivi, pattern, profili e impostazioni;
- salvataggio e validazione della fotografia locale delle novità;
- generazione ICS, escaping e feed stanza;
- generatore ICS della Edge Function (feed in abbonamento);
- decisione di bootstrap locale/cloud;
- schermata offline in sola lettura;
- applicazione e persistenza del tema;
- validazione del cambio password.

## Sicurezza e privacy

- Il sito è pubblico, ma i dati sono accessibili solo dopo login.
- RLS e allowlist limitano lettura/scrittura alle due email configurate.
- La publishable key è pubblica per design; la secret key non è nel frontend.
- Il backup JSON e i token dei feed ICS vanno trattati come dati personali.
- La Edge Function `ics` è pubblica ma protetta dal token; usa la service role key solo lato server.
- Supabase Free mette in pausa i progetti dopo 7 giorni di inattività; con l'uso quotidiano non è un problema.

## Prossime fasi

- **Fase 5 — Rifiniture:** export CSV, auto-proposta del piano e ulteriori rifiniture PWA.
