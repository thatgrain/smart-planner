import { useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  FileText,
  Info,
  Lock,
  Moon,
  RotateCcw,
  Thermometer,
  Umbrella,
  X,
} from 'lucide-react'
import { isLightColor, withAlpha } from '../../lib/color'
import { cn } from '../../lib/cn'
import { addDaysKey, formatDayLong, formatDayShort } from '../../lib/domain/dates'
import {
  ABSENCE_LABELS,
  getAbsencesForDate,
  getEligibilityLabel,
  getHoliday,
  getIneligibilityReason,
  getNight,
  getPerson,
  isEligible,
} from '../../lib/domain/eligibility'
import { getCoverageSources, getPresenceEntry } from '../../lib/domain/coverage'
import type {
  AbsenceType,
  Person,
  PersonId,
  PlannerState,
} from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PersonAvatar } from '../ui/PersonAvatar'

const absenceIcons: Record<AbsenceType, typeof Umbrella> = {
  vacation: Umbrella,
  sick: Thermometer,
  permit: FileText,
  closure: Lock,
}

interface DayDrawerProps {
  date: string | null
  state: PlannerState
  onClose: () => void
  onSetNight: (date: string, personId: PersonId | null) => void
  onTogglePresence: (date: string, personId: PersonId) => void
  onResetPresence: (date: string, personId?: PersonId) => void
  onManageAbsences: () => void
}

export function DayDrawer({
  date,
  state,
  onClose,
  onSetNight,
  onTogglePresence,
  onResetPresence,
  onManageAbsences,
}: DayDrawerProps) {
  useEffect(() => {
    if (!date) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [date, onClose])

  if (!date) return null

  const previousDate = addDaysKey(date, -1)
  const nextDate = addDaysKey(date, 1)
  const holiday = getHoliday(state, date)
  const night = getNight(state, date)
  const previousNight = getNight(state, previousDate)
  const nextNight = getNight(state, nextDate)
  const absences = getAbsencesForDate(state, date)
  const collective = absences.collective
  const personal = absences.personal
  const hasAnyAbsence =
    collective.length > 0 || personal.A.length > 0 || personal.B.length > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Chiudi pannello"
        className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[2px] sp-fade-in"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-2xl sp-slide-in sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Dettaglio giornata
            </div>
            <h2 className="mt-0.5 text-lg font-semibold leading-tight text-slate-900 dark:text-slate-50">
              {formatDayLong(date)}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {holiday ? <Badge variant="danger">{holiday.name}</Badge> : null}
              {hasAnyAbsence ? <Badge variant="warning">Assenza</Badge> : null}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Chiudi">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="scrollbar-subtle flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Notte in stanza
              </h3>
              {night?.personId ? (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {getPerson(state, night.personId).name}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">libera</span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {state.people.map((person) => {
                const active = night?.personId === person.id
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => onSetNight(date, person.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition',
                      active
                        ? 'text-slate-900 dark:text-slate-50 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    )}
                    style={
                      active
                        ? {
                            borderColor: withAlpha(person.color, 0.55),
                            backgroundColor: withAlpha(person.color, 0.1),
                          }
                        : undefined
                    }
                  >
                    <PersonAvatar person={person} size="md" />
                    <span className="truncate">{person.name}</span>
                    {active ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                        style={{ color: person.color }}
                      >
                        <Check className="h-3 w-3" /> Selezionata
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Assegna</span>
                    )}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => onSetNight(date, null)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition',
                  !night?.personId
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  <X className="h-4 w-4" />
                </span>
                <span>Libera</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {!night?.personId ? 'Selezionata' : 'Nessuno'}
                </span>
              </button>
            </div>

            <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Una notte copre la presenza del giorno stesso e di quello successivo.
                {night?.personId
                  ? ` Questa notte può coprire ${formatDayShort(date)} e ${formatDayShort(nextDate)}.`
                  : ''}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                Notte precedente: {previousNight?.personId ? getPerson(state, previousNight.personId).name : 'libera'}
              </span>
              <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">
                Notte successiva: {nextNight?.personId ? getPerson(state, nextNight.personId).name : 'libera'}
              </span>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Presenza in ufficio
            </h3>
            <div className="mt-2 space-y-2">
              {state.people.map((person) => (
                <PersonPresenceRow
                  key={person.id}
                  state={state}
                  person={person}
                  date={date}
                  onToggle={() => onTogglePresence(date, person.id)}
                  onReset={() => onResetPresence(date, person.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Umbrella className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              Assenze e festivi
            </h3>
            <div className="mt-2 space-y-1.5">
              {holiday ? (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span className="flex-1">{holiday.name}</span>
                  <Badge variant="danger">Festivo</Badge>
                </div>
              ) : null}
              {collective.map((absence) => {
                const Icon = absenceIcons[absence.type]
                return (
                  <div
                    key={absence.id}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1">{ABSENCE_LABELS[absence.type]}</span>
                    <Badge variant="danger">Entrambi</Badge>
                  </div>
                )
              })}
              {(['A', 'B'] as const).flatMap((personId) =>
                personal[personId].map((absence) => {
                  const Icon = absenceIcons[absence.type]
                  const person = getPerson(state, personId)
                  return (
                    <div
                      key={absence.id}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="flex-1">
                        {ABSENCE_LABELS[absence.type]} · {person.name}
                      </span>
                      <Badge variant="neutral">Individuale</Badge>
                    </div>
                  )
                }),
              )}
              {!holiday && !hasAnyAbsence ? (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500">
                  Nessuna assenza o festivo in questa data.
                </div>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={onManageAbsences}>
              Gestisci assenze e festivi
            </Button>
          </section>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Le modifiche vengono sincronizzate con il piano condiviso.
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Chiudi
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function PersonPresenceRow({
  state,
  person,
  date,
  onToggle,
  onReset,
}: {
  state: PlannerState
  person: Person
  date: string
  onToggle: () => void
  onReset: () => void
}) {
  const entry = getPresenceEntry(state, person.id, date)
  const present = entry?.status === 'present'
  const excluded = entry?.status === 'excluded'
  const eligible = isEligible(state, person.id, date)
  const reason = getIneligibilityReason(state, person.id, date)
  const coverage = getCoverageSources(state, person.id, date)
  const covered = coverage.previousNight || coverage.sameNight
  const exception = present && !covered
  const canToggle =
    present || (eligible && (covered || state.settings.allowPresenceWithoutNight))

  const coverageLabel = coverage.previousNight && coverage.sameNight
    ? 'Coperta dalla notte di ieri e di oggi'
    : coverage.previousNight
      ? 'Coperta dalla notte di ieri'
      : coverage.sameNight
        ? 'Coperta dalla notte di oggi'
        : 'Nessuna notte adiacente'

  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-colors',
        present ? 'bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60',
      )}
      style={
        present
          ? {
              borderColor: withAlpha(person.color, 0.35),
              backgroundColor: withAlpha(person.color, 0.05),
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PersonAvatar person={person} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">{person.name}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {eligible ? coverageLabel : getEligibilityLabel(state, person.id, date)}
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={present}
          aria-label={`Presenza di ${person.name}`}
          disabled={!canToggle}
          onClick={onToggle}
          className={cn(
            'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors',
            present ? 'border-transparent' : 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-700',
            !canToggle && 'cursor-not-allowed opacity-40',
          )}
          style={present ? { backgroundColor: person.color } : undefined}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-slate-100',
              present ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {present ? (
          <>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: person.color, color: isLightColor(person.color) ? '#0f172a' : '#ffffff' }}
            >
              <Check className="h-3 w-3" /> Presente
            </span>
            {entry?.source === 'auto' ? (
              <Badge variant="info">Proposta automatica</Badge>
            ) : (
              <Badge variant="neutral">Modificata a mano</Badge>
            )}
            {exception ? <Badge variant="warning">Eccezione</Badge> : null}
            {covered ? <Badge variant="success">Coperta</Badge> : null}
          </>
        ) : excluded ? (
          <>
            <Badge variant="neutral">Esclusa a mano</Badge>
            {covered ? <Badge variant="info">Copertura disponibile</Badge> : null}
          </>
        ) : eligible ? (
          <Badge variant="outline">Non presente</Badge>
        ) : (
          <Badge variant="warning">Non eleggibile</Badge>
        )}
        {reason === 'weekend' ? <Badge variant="neutral">Weekend</Badge> : null}
        {reason === 'holiday' ? <Badge variant="danger">Festivo</Badge> : null}
        {reason === 'closure' ? <Badge variant="danger">Chiusura</Badge> : null}
        {reason === 'absence' ? <Badge variant="warning">Assenza</Badge> : null}
      </div>

      {!eligible ? (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          La presenza non è conteggiata in un giorno non eleggibile.
        </div>
      ) : !covered && present ? (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Presenza senza pernottamento adiacente: è un'eccezione consentita.
        </div>
      ) : !covered && !present && !state.settings.allowPresenceWithoutNight ? (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Presenza senza notte disabilitata nelle impostazioni.
        </div>
      ) : null}

      {entry?.source === 'manual' || excluded ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <RotateCcw className="h-3 w-3" />
          Ripristina proposta automatica
        </button>
      ) : null}
    </div>
  )
}
