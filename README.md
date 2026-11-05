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
- Feed ICS in abbonamento con URL segreto e rotazione del token.
- PWA installabile su Android e iPhone, con icona, schermo intero e cache dell'app.
- Consultazione offline in sola lettura dell'ultimo piano salvato.
- Layout mobile semplificato: riepilogo compatto, calendario subito visibile e dettagli espandibili.
- Tema chiaro, scuro o automatico dal sistema, con preferenza per dispositivo.
- Cambio password dal pannello Sicurezza, con verifica della password attuale.
- Recupero password tramite email con link monouso Supabase.

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
npm test        # dominio, bootstrap cloud, schermate cloud, feed ICS e smoke test UI
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

Le password le scelgono gli utenti e non vengono mai salvate nel repository.

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

### 6. SMTP e recupero password

Il reset password usa le email di Supabase Auth. L'email integrata di Supabase **non è affidabile**:

- 2 email/ora per progetto;
- invia solo a indirizzi autorizzati del team;
- non garantisce consegna.

Per usare il recupero con entrambi gli account serve un **SMTP personalizzato**. Consigliamo **Brevo** (free, circa 300 email/giorno, mittente verificabile senza dominio):

1. crea un account Brevo;
2. verifica l'indirizzo mittente;
3. genera una SMTP key;
4. in Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - Host: `smtp-relay.brevo.com`
   - Porta: `587` (STARTTLS) o `465` (SSL)
   - Username: email account Brevo
   - Password: SMTP key
   - Sender email: indirizzo verificato
   - Sender name: `SmartPlanner`

Poi configura gli URL in **Authentication → URL Configuration**:

- **Site URL:** `https://thatgrain.github.io/smart-planner/`
- **Redirect URLs:**
  - `https://thatgrain.github.io/smart-planner/**`
  - `http://localhost:5173/**`

Il template **Reset Password** può restare quello di default. Il link scade secondo le impostazioni Supabase ed è monouso.

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
- stato mese con pulsante **Conferma**;
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

### Recupero password

Dalla schermata di login:

1. **Password dimenticata?**
2. inserisci l'email;
3. ricevi un link monouso;
4. il link riapre SmartPlanner sulla schermata **Imposta nuova password**;
5. dopo il salvataggio, l'app disconnette la sessione di recovery e le altre sessioni, poi torna al login.

L'app usa `resetPasswordForEmail` e gestisce l'evento `PASSWORD_RECOVERY` di Supabase. Il link scade secondo le impostazioni Supabase, funziona una sola volta e non rivela se l'email è registrata.

Per funzionare serve:

- SMTP configurato (vedi **Configurazione Supabase → 6. SMTP**);
- Site URL e Redirect URLs corretti;
- `detectSessionInUrl` attivo nel client Supabase.

Se l'SMTP non è configurato, il form mostra un errore chiaro e nessuna email viene inviata.

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

In entrambi i casi, i mesi senza notti, assenze o piano confermato esportano solo le presenze esplicite.

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
    cloud/        login, reset password, loading, errore, conflitto locale/cloud
    layout/       header, tab, footer
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
    domain/           regole di dominio, date, festivi, metriche, ICS
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
- eccezioni, notti non sfruttate e notti a cavallo del mese;
- conferma/riapertura del mese;
- generazione ICS, escaping e feed stanza;
- generatore ICS della Edge Function (feed in abbonamento);
- decisione di bootstrap locale/cloud;
- schermata offline in sola lettura;
- applicazione e persistenza del tema;
- validazione del cambio password;
- richiesta del link di recupero e reset della password.

## Sicurezza e privacy

- Il sito è pubblico, ma i dati sono accessibili solo dopo login.
- RLS e allowlist limitano lettura/scrittura alle due email configurate.
- La publishable key è pubblica per design; la secret key non è nel frontend.
- Il backup JSON e i token dei feed ICS vanno trattati come dati personali.
- La Edge Function `ics` è pubblica ma protetta dal token; usa la service role key solo lato server.
- Supabase Free mette in pausa i progetti dopo 7 giorni di inattività; con l'uso quotidiano non è un problema.

## Prossime fasi

- **Fase 5 — Rifiniture:** export CSV, auto-proposta del piano, PWA, notifiche.
