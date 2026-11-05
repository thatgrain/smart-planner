import { useMemo, useState } from 'react'
import {
  CalendarDays,
  FileText,
  Info,
  Lock,
  Plus,
  Thermometer,
  Trash2,
  Umbrella,
} from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { cn } from '../lib/cn'
import {
  daysBetweenInclusive,
  formatDayShort,
  formatMonthLabel,
  formatRange,
  todayKey,
} from '../lib/domain/dates'
import { ABSENCE_LABELS, getPerson } from '../lib/domain/eligibility'
import type { AbsenceType, PersonId } from '../lib/domain/types'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const absenceIcons: Record<AbsenceType, typeof Umbrella> = {
  vacation: Umbrella,
  sick: Thermometer,
  permit: FileText,
  closure: Lock,
}

type PersonSelection = PersonId | 'both'

export function AbsencesView({ controller }: { controller: PlannerController }) {
  const { state, month, actions } = controller
  const [person, setPerson] = useState<PersonSelection>('A')
  const [type, setType] = useState<AbsenceType>('vacation')
  const [start, setStart] = useState(`${month}-01`)
  const [end, setEnd] = useState(`${month}-01`)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteAbsenceId, setDeleteAbsenceId] = useState<string | null>(null)
  const [deleteHolidayDate, setDeleteHolidayDate] = useState<string | null>(null)
  const [holidayDate, setHolidayDate] = useState(`${month}-01`)
  const [holidayName, setHolidayName] = useState('')
  const [holidayError, setHolidayError] = useState<string | null>(null)

  const sortedAbsences = useMemo(
    () => [...state.absences].sort((a, b) => a.start.localeCompare(b.start)),
    [state.absences],
  )

  const year = month.slice(0, 4)
  const yearHolidays = useMemo(
    () =>
      state.holidays
        .filter((holiday) => holiday.date.startsWith(year))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [state.holidays, year],
  )

  const handlePersonChange = (value: PersonSelection) => {
    setPerson(value)
    if (value === 'both') setType('closure')
    else if (type === 'closure') setType('vacation')
  }

  const handleTypeChange = (value: AbsenceType) => {
    setType(value)
    if (value === 'closure') setPerson('both')
    else if (person === 'both') setPerson('A')
  }

  const submitAbsence = () => {
    setError(null)
    setMessage(null)
    if (!start || !end) {
      setError('Inserisci data di inizio e fine.')
      return
    }
    if (start > end) {
      setError('La data di fine non può precedere quella di inizio.')
      return
    }
    actions.addAbsence({
      personId: person === 'both' ? null : person,
      type,
      start,
      end,
      note,
    })
    setNote('')
    setMessage(
      `${ABSENCE_LABELS[type]} aggiunta${person === 'both' ? ' per entrambi' : ` per ${getPerson(state, person).name}`}.`,
    )
  }

  const submitHoliday = () => {
    setHolidayError(null)
    setMessage(null)
    if (!holidayDate || !holidayName.trim()) {
      setHolidayError('Inserisci data e nome del festivo.')
      return
    }
    actions.addHoliday({
      date: holidayDate,
      name: holidayName.trim(),
      source: 'custom',
    })
    setHolidayName('')
    setMessage(`Festivo aggiunto il ${formatDayShort(holidayDate)}.`)
  }

  const absenceToDelete = sortedAbsences.find((absence) => absence.id === deleteAbsenceId)
  const holidayToDelete = yearHolidays.find((holiday) => holiday.date === deleteHolidayDate)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-linear-to-br from-indigo-50/80 via-white to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-5 shadow-soft">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">
          <CalendarDays className="h-3.5 w-3.5" />
          Calcolo mensile
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Assenze e festivi
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          Ferie, malattia, permessi e chiusure aziendali vengono esclusi dal calcolo del 50%:
          riducono i giorni eleggibili della persona interessata o di entrambi. I weekend sono
          sempre esclusi.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Nuova assenza</h3>
            <Badge variant="info">Individuale o collettiva</Badge>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Persona</label>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {state.people.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePersonChange(item.id)}
                    className={cn(
                      'rounded-xl border px-2 py-2 text-xs font-medium transition',
                      person === item.id
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    )}
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePersonChange('both')}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-xs font-medium transition',
                    person === 'both'
                      ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  )}
                >
                  Entrambi
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="absence-type" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Tipo
              </label>
              <select
                id="absence-type"
                value={type}
                onChange={(event) => handleTypeChange(event.target.value as AbsenceType)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              >
                <option value="vacation">Ferie</option>
                <option value="sick">Malattia</option>
                <option value="permit">Permesso / ROL</option>
                <option value="closure">Chiusura aziendale</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="absence-start" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Dal
                </label>
                <input
                  id="absence-start"
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                />
              </div>
              <div>
                <label htmlFor="absence-end" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Al
                </label>
                <input
                  id="absence-end"
                  type="date"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="absence-note" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Nota <span className="font-normal text-slate-400 dark:text-slate-500">(opzionale)</span>
              </label>
              <input
                id="absence-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Es. ponte, visita medica, chiusura estiva…"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
              />
            </div>

            {error ? (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">{error}</div>
            ) : null}
            {message ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                {message}
              </div>
            ) : null}

            <Button variant="primary" className="w-full" onClick={submitAbsence}>
              <Plus className="h-4 w-4" />
              Aggiungi assenza
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Festivi {year}</h3>
            <Badge variant="neutral">{yearHolidays.length} giorni</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            I festivi nazionali sono precompilati. Puoi aggiungere il santo patrono o una
            chiusura aziendale come festivo personalizzato.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_auto]">
            <input
              type="date"
              value={holidayDate}
              onChange={(event) => setHolidayDate(event.target.value)}
              aria-label="Data festivo"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
            <input
              type="text"
              value={holidayName}
              onChange={(event) => setHolidayName(event.target.value)}
              placeholder="Nome del festivo"
              aria-label="Nome festivo"
              className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
            />
            <Button variant="secondary" size="sm" onClick={submitHoliday}>
              <Plus className="h-3.5 w-3.5" />
              Aggiungi
            </Button>
          </div>
          {holidayError ? (
            <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-300">
              {holidayError}
            </div>
          ) : null}

          <div className="scrollbar-subtle mt-3 max-h-[260px] space-y-1 overflow-y-auto pr-1">
            {yearHolidays.map((holiday) => (
              <div
                key={holiday.date}
                className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2"
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                    {holiday.name}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatDayShort(holiday.date)}</div>
                </div>
                <Badge variant={holiday.source === 'national' ? 'neutral' : 'info'}>
                  {holiday.source === 'national' ? 'Nazionale' : 'Personalizzato'}
                </Badge>
                <button
                  type="button"
                  onClick={() => setDeleteHolidayDate(holiday.date)}
                  aria-label={`Elimina ${holiday.name}`}
                  className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {yearHolidays.length === 0 ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-3 text-[11px] text-slate-400 dark:text-slate-500">
                Nessun festivo per il {year}.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Assenze registrate</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Periodo visualizzato: {formatMonthLabel(month)}
            </p>
          </div>
          <Badge variant="neutral">{sortedAbsences.length} totali</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {sortedAbsences.map((absence) => {
            const Icon = absenceIcons[absence.type]
            const personName =
              absence.personId === null ? 'Entrambi' : getPerson(state, absence.personId).name
            const days = daysBetweenInclusive(absence.start, absence.end)
            const isCollective = absence.personId === null
            return (
              <div
                key={absence.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3 py-3',
                  isCollective ? 'border-rose-100 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                    isCollective ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {ABSENCE_LABELS[absence.type]}
                    </span>
                    <Badge variant={isCollective ? 'danger' : 'neutral'}>{personName}</Badge>
                    <Badge variant="outline">
                      {days} {days === 1 ? 'giorno' : 'giorni'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {formatRange(absence.start, absence.end)}
                    {absence.note ? ` · ${absence.note}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteAbsenceId(absence.id)}
                  aria-label={`Elimina assenza ${ABSENCE_LABELS[absence.type]}`}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          {sortedAbsences.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Nessuna assenza registrata. Le ferie e le chiusure aggiunte qui vengono escluse dal
              calcolo del 50%.
            </div>
          ) : null}
        </div>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
        <span>
          Le assenze non cancellano automaticamente le notti già assegnate: l'app segnala le notti
          durante un'assenza e puoi liberarle dal dettaglio del giorno. La chiusura aziendale è
          collettiva e vale per entrambi.
        </span>
      </div>

      <ConfirmDialog
        open={deleteAbsenceId !== null}
        onClose={() => setDeleteAbsenceId(null)}
        onConfirm={() => {
          if (deleteAbsenceId) actions.removeAbsence(deleteAbsenceId)
        }}
        title="Eliminare l'assenza?"
        message={
          absenceToDelete
            ? `Verrà rimossa ${ABSENCE_LABELS[absenceToDelete.type].toLowerCase()} del ${formatRange(
                absenceToDelete.start,
                absenceToDelete.end,
              )}. I giorni torneranno eleggibili nel calcolo.`
            : "Verrà rimossa l'assenza selezionata."
        }
        confirmLabel="Elimina"
        danger
      />

      <ConfirmDialog
        open={deleteHolidayDate !== null}
        onClose={() => setDeleteHolidayDate(null)}
        onConfirm={() => {
          if (deleteHolidayDate) actions.removeHoliday(deleteHolidayDate)
        }}
        title="Eliminare il festivo?"
        message={
          holidayToDelete
            ? `Verrà rimosso "${holidayToDelete.name}" del ${formatDayShort(holidayToDelete.date)}. Il giorno tornerà eleggibile.`
            : 'Verrà rimosso il festivo selezionato.'
        }
        confirmLabel="Elimina"
        danger
      />

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStart(todayKey())
            setEnd(todayKey())
          }}
        >
          Usa oggi come data di inizio
        </Button>
      </div>
    </div>
  )
}
