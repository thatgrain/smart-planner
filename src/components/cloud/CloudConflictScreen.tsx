import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Cloud,
  HardDrive,
  LoaderCircle,
  Moon,
  Umbrella,
} from 'lucide-react'
import type { PlannerState } from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function summary(state: PlannerState) {
  return {
    people: state.people.map((person) => person.name).join(' e '),
    nights: state.nights.filter((night) => night.personId).length,
    presence: state.presence.filter((entry) => entry.status === 'present').length,
    absences: state.absences.length,
  }
}

function StateCard({
  kind,
  state,
  updatedAt,
  onChoose,
  busy,
}: {
  kind: 'cloud' | 'local'
  state: PlannerState
  updatedAt?: string | null
  onChoose: () => void
  busy: boolean
}) {
  const data = summary(state)
  const cloud = kind === 'cloud'

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <span
          className={
            cloud
              ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600'
              : 'flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600'
          }
        >
          {cloud ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {cloud ? 'Piano cloud' : 'Piano locale'}
          </div>
          <div className="text-[10px] text-slate-400">
            {cloud
              ? updatedAt
                ? `Ultimo aggiornamento: ${dateTimeFormatter.format(new Date(updatedAt))}`
                : 'Data di aggiornamento sconosciuta'
              : 'Salvato solo in questo browser'}
          </div>
        </div>
        <Badge variant={cloud ? 'info' : 'neutral'} className="ml-auto">
          {data.people}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-400">
            <Moon className="h-3 w-3" /> Notti
          </div>
          <div className="text-sm font-semibold text-slate-900">{data.nights}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-400">
            <Building2 className="h-3 w-3" /> Presenze
          </div>
          <div className="text-sm font-semibold text-slate-900">{data.presence}</div>
        </div>
        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-400">
            <Umbrella className="h-3 w-3" /> Assenze
          </div>
          <div className="text-sm font-semibold text-slate-900">{data.absences}</div>
        </div>
      </div>

      <Button
        variant={cloud ? 'primary' : 'danger'}
        className="mt-4 w-full"
        onClick={onChoose}
        disabled={busy}
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : cloud ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <HardDrive className="h-4 w-4" />
        )}
        {cloud ? 'Usa il piano cloud' : 'Carica il piano locale'}
      </Button>
    </div>
  )
}

export function CloudConflictScreen({
  local,
  remote,
  remoteUpdatedAt,
  onUseCloud,
  onUseLocal,
  busy = false,
  error = null,
}: {
  local: PlannerState
  remote: PlannerState
  remoteUpdatedAt: string | null
  onUseCloud: () => void
  onUseLocal: () => void
  busy?: boolean
  error?: string | null
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            Quale piano vuoi usare?
          </h1>
          <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
            Questo browser ha un piano locale, mentre il cloud ne contiene già uno. Scegli quale
            tenere: l'opzione selezionata sovrascrive l'altra.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <StateCard
            kind="cloud"
            state={remote}
            updatedAt={remoteUpdatedAt}
            onChoose={onUseCloud}
            busy={busy}
          />
          <StateCard
            kind="local"
            state={local}
            onChoose={onUseLocal}
            busy={busy}
          />
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] leading-5 text-rose-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Il piano cloud è condiviso con Pietro. Se scegli il piano locale, il piano cloud
            attuale verrà sostituito per entrambi.
          </span>
        </div>
      </div>
    </div>
  )
}
