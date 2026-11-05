import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Cloud,
  Database,
  Download,
  HardDrive,
  Info,
  LoaderCircle,
  LogOut,
  Mail,
  Percent,
  RefreshCw,
  RotateCcw,
  Settings2,
  Upload,
  UserRound,
  WifiOff,
} from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { cn } from '../lib/cn'
import { formatMonthLabel, todayKey, weekdayName } from '../lib/domain/dates'
import { serialiseState } from '../lib/storage'
import { downloadTextFile } from '../lib/download'
import { ChangePasswordCard } from '../components/account/ChangePasswordCard'
import { InstallCard } from '../components/pwa/InstallCard'
import { ThemeCard } from '../components/settings/ThemeCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PersonAvatar } from '../components/ui/PersonAvatar'
import { Switch } from '../components/ui/Switch'

export function SettingsView({ controller }: { controller: PlannerController }) {
  const { state, month, actions, cloud } = controller
  const [resetOpen, setResetOpen] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const storageSize = useMemo(() => {
    const bytes = new Blob([JSON.stringify(state)]).size
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }, [state])

  const exportBackup = () => {
    downloadTextFile(
      `smartplanner-backup-${todayKey()}.json`,
      serialiseState(state),
      'application/json',
    )
  }

  const importBackup = async (file: File) => {
    setImportMessage(null)
    try {
      const text = await file.text()
      const ok = actions.importState(text)
      setImportMessage(
        ok
          ? 'Backup importato correttamente. I dati sono stati sostituiti.'
          : 'File non valido: il backup deve essere un JSON esportato da SmartPlanner.',
      )
    } catch {
      setImportMessage('Impossibile leggere il file selezionato.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-linear-to-br from-indigo-50/80 via-white to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-5 shadow-soft">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
          <Settings2 className="h-3.5 w-3.5" />
          Configurazione
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Impostazioni</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          {cloud.active
            ? 'Personalizza nomi, colori e regole di calcolo. Il piano è condiviso con Pietro e sincronizzato in tempo reale; puoi comunque esportare un backup JSON.'
            : 'Personalizza nomi, colori e regole di calcolo. I dati sono salvati localmente nel browser; puoi esportarli come backup JSON.'}
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={
                cloud.active
                  ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }
            >
              {cloud.active ? <Cloud className="h-5 w-5" /> : <HardDrive className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Account e sincronizzazione
                </h3>
                <Badge
                  variant={
                    !cloud.active
                      ? 'neutral'
                      : cloud.syncStatus === 'error'
                        ? 'danger'
                        : cloud.offline || cloud.syncStatus === 'offline'
                          ? 'warning'
                          : cloud.syncStatus === 'saving' || cloud.syncStatus === 'loading'
                            ? 'warning'
                            : 'success'
                  }
                >
                  {!cloud.active
                    ? 'Locale'
                    : cloud.syncStatus === 'error'
                      ? 'Errore'
                      : cloud.offline || cloud.syncStatus === 'offline'
                        ? 'Offline'
                        : cloud.syncStatus === 'saving'
                          ? 'Salvataggio…'
                          : cloud.syncStatus === 'loading'
                            ? 'Connessione…'
                            : 'Sincronizzato'}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {cloud.active ? (
                  <>
                    <Mail className="h-3 w-3" />
                    {cloud.sessionEmail}
                  </>
                ) : cloud.configured ? (
                  'Cloud disattivato: stai usando solo i dati di questo browser.'
                ) : (
                  'Supabase non configurato: modalità locale.'
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {cloud.active ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void cloud.syncNow()}
                  disabled={cloud.offline || !cloud.ready || cloud.syncStatus === 'saving'}
                >
                  {cloud.syncStatus === 'saving' ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Sincronizza ora
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void cloud.reloadCloud()}
                  disabled={cloud.offline || !cloud.ready}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  Ricarica dal cloud
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void cloud.signOut()}>
                  <LogOut className="h-3.5 w-3.5" />
                  Esci
                </Button>
              </>
            ) : cloud.configured ? (
              <Button variant="primary" size="sm" onClick={cloud.retryCloud}>
                <Cloud className="h-3.5 w-3.5" />
                Torna al cloud
              </Button>
            ) : null}
          </div>
        </div>

        {cloud.syncError ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 text-[11px] leading-5 text-rose-700 dark:text-rose-300 sm:flex-row sm:items-start">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{cloud.syncError.title}</div>
              <div>{cloud.syncError.message}</div>
              {cloud.syncError.hint ? <div className="mt-0.5">{cloud.syncError.hint}</div> : null}
            </div>
            <Button variant="secondary" size="sm" onClick={() => void cloud.syncNow()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Riprova
            </Button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          {cloud.offline ? (
            <>
              <WifiOff className="h-3 w-3 text-amber-500 dark:text-amber-400" />
              Modalità offline: stai vedendo l'ultimo piano salvato.
            </>
          ) : cloud.active ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              Le modifiche vengono sincronizzate in tempo reale con Pietro.
            </>
          ) : (
            <>
              <Info className="h-3 w-3" />
              I dati restano solo in questo browser.
            </>
          )}
        </div>
      </Card>

      <InstallCard />
      <ThemeCard />
      <ChangePasswordCard cloud={cloud} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Persone</h3>
          </div>
          <div className="mt-4 space-y-4">
            {state.people.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                <PersonAvatar person={person} size="lg" />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_72px]">
                  <div>
                    <label
                      htmlFor={`person-name-${person.id}`}
                      className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      Nome
                    </label>
                    <input
                      id={`person-name-${person.id}`}
                      type="text"
                      value={person.name}
                      onChange={(event) =>
                        actions.updatePerson(person.id, { name: event.target.value })
                      }
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`person-color-${person.id}`}
                      className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      Colore
                    </label>
                    <input
                      id={`person-color-${person.id}`}
                      type="color"
                      value={person.color}
                      onChange={(event) =>
                        actions.updatePerson(person.id, { color: event.target.value })
                      }
                      className="mt-1 h-9 w-full cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Regole di calcolo</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <Percent className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  Limite smart working
                </div>
                <div className="mt-0.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                  Percentuale massima di giorni SW sui giorni eleggibili.
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={state.settings.swCapPct}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    actions.updateSettings({
                      swCapPct: Number.isFinite(value)
                        ? Math.min(100, Math.max(0, value))
                        : 0,
                    })
                  }}
                  className="h-9 w-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                  aria-label="Percentuale massima smart working"
                />
                <span className="text-xs text-slate-400 dark:text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">Arrotondamento stretto</div>
                <div className="mt-0.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                  Con 21 giorni eleggibili il massimo è 10 SW (non 11). Consigliato.
                </div>
              </div>
              <Switch
                checked={state.settings.strictCap}
                onChange={(checked) => actions.updateSettings({ strictCap: checked })}
                label="Arrotondamento stretto"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Presenza senza notte
                </div>
                <div className="mt-0.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                  Consente eccezioni di pendolarismo, evidenziate come tali.
                </div>
              </div>
              <Switch
                checked={state.settings.allowPresenceWithoutNight}
                onChange={(checked) =>
                  actions.updateSettings({ allowPresenceWithoutNight: checked })
                }
                label="Presenza senza notte"
              />
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              <Info className="mr-1 inline h-3 w-3" />
              Modificare queste regole riporta i mesi in bozza e ricalcola le presenze automatiche.
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Giorni non lavorativi</h3>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Seleziona i giorni della settimana esclusi dal calcolo. Di default sabato e domenica.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const active = state.settings.weekendDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? state.settings.weekendDays.filter((value) => value !== day)
                      : [...state.settings.weekendDays, day].sort()
                    actions.updateSettings({ weekendDays: next })
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-medium transition',
                    active
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  )}
                >
                  {weekdayName(day, true)}
                </button>
              )
            })}
          </div>
          <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            Giorni esclusi: {state.settings.weekendDays.map((day) => weekdayName(day)).join(', ') || 'nessuno'}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Dati e backup</h3>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            {cloud.active
              ? 'Il piano è nel cloud e viene salvato anche in questo browser. Esporta un backup JSON se vuoi una copia indipendente.'
              : 'I dati sono salvati in localStorage. Esporta un backup prima di cambiare browser o dispositivo.'}
          </p>

          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
            <HardDrive className="h-3 w-3" />
            Dimensione dati: {storageSize} · {state.nights.length} notti · {state.presence.length} presenze
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportBackup}>
              <Download className="h-3.5 w-3.5" />
              Esporta JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Importa JSON
            </Button>
            <Button variant="danger" size="sm" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Ripristina demo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importBackup(file)
                event.target.value = ''
              }}
            />
          </div>

          {importMessage ? (
            <div
              className={cn(
                'mt-3 rounded-xl px-3 py-2 text-[11px]',
                importMessage.startsWith('Backup importato')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
              )}
            >
              {importMessage}
            </div>
          ) : null}

          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
            <Info className="mr-1 inline h-3 w-3" />
            {cloud.active
              ? 'Importare un backup sostituisce il piano condiviso per entrambi. Usa questa funzione con attenzione.'
              : 'Modalità locale: i dati non sono condivisi tra te e Pietro. Configura Supabase per sincronizzarli.'}
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          Mese visualizzato: <span className="font-medium text-slate-700 dark:text-slate-300">{formatMonthLabel(month)}</span>
        </span>
        <Badge variant={cloud.active ? 'success' : 'neutral'}>
          SmartPlanner · {cloud.active ? 'Cloud' : 'Locale'}
        </Badge>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={actions.resetDemo}
        title="Ripristinare i dati demo?"
        message={
          cloud.active
            ? "Tutte le notti, presenze, assenze e festivi personalizzati verranno sostituiti dai dati iniziali. Il piano condiviso nel cloud verrà aggiornato per entrambi. L'operazione non può essere annullata."
            : "Tutte le notti, presenze, assenze e festivi personalizzati verranno sostituiti dai dati iniziali. L'operazione non può essere annullata."
        }
        confirmLabel="Ripristina"
        danger
      />
    </div>
  )
}
