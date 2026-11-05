import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  FileText,
  House,
  Info,
  Lock,
  Moon,
  Thermometer,
  Umbrella,
} from 'lucide-react'
import { withAlpha, isLightColor } from '../../lib/color'
import { cn } from '../../lib/cn'
import {
  addDaysKey,
  formatDayLong,
  formatDayNumber,
  isTodayKey,
} from '../../lib/domain/dates'
import {
  ABSENCE_SHORT_LABELS,
  getAbsencesForDate,
  getHoliday,
  getNight,
  getPerson,
  isEligible,
  isWeekend,
} from '../../lib/domain/eligibility'
import { isPersonPresent, isPresenceCoveredByNight } from '../../lib/domain/coverage'
import type { AbsenceType, PlannerState } from '../../lib/domain/types'

const absenceIcons: Record<AbsenceType, typeof Umbrella> = {
  vacation: Umbrella,
  sick: Thermometer,
  permit: FileText,
  closure: Lock,
}

interface DayCellProps {
  date: string
  inMonth: boolean
  state: PlannerState
  selected: boolean
  onOpen: (date: string) => void
}

export function DayCell({ date, inMonth, state, selected, onOpen }: DayCellProps) {
  const dayNumber = formatDayNumber(date)
  const today = isTodayKey(date)
  const holiday = getHoliday(state, date)
  const weekend = isWeekend(state, date)
  const night = getNight(state, date)
  const nightPerson = night?.personId ? getPerson(state, night.personId) : null
  const absences = getAbsencesForDate(state, date)
  const present = state.people.filter((person) => isPersonPresent(state, person.id, date))
  const eligiblePeople = state.people.filter((person) => isEligible(state, person.id, date))
  const smartPeople = eligiblePeople.filter(
    (person) => !isPersonPresent(state, person.id, date),
  )
  const handover = present.length === 2
  const nextDate = addDaysKey(date, 1)
  const nightUseful = nightPerson
    ? (isPersonPresent(state, nightPerson.id, date) &&
        isEligible(state, nightPerson.id, date)) ||
      (isPersonPresent(state, nightPerson.id, nextDate) &&
        isEligible(state, nightPerson.id, nextDate))
    : false
  const wastedNight = Boolean(nightPerson && !nightUseful)
  const exceptionPeople = present.filter(
    (person) => !isPresenceCoveredByNight(state, person.id, date),
  )
  const collectiveAbsences = absences.collective
  const personalAbsences = [
    ...absences.personal.A.map((absence) => ({ absence, personId: 'A' as const })),
    ...absences.personal.B.map((absence) => ({ absence, personId: 'B' as const })),
  ]
  const hasAbsence = collectiveAbsences.length > 0 || personalAbsences.length > 0
  const showFreeNight =
    !nightPerson && !weekend && !holiday && collectiveAbsences.length === 0

  const ariaParts = [formatDayLong(date)]
  if (nightPerson) ariaParts.push(`notte di ${nightPerson.name}`)
  if (present.length > 0) ariaParts.push(`in ufficio: ${present.map((p) => p.name).join(', ')}`)
  if (smartPeople.length > 0)
    ariaParts.push(`smart working: ${smartPeople.map((p) => p.name).join(', ')}`)

  if (!inMonth) {
    return (
      <button
        type="button"
        onClick={() => onOpen(date)}
        aria-label={`Vai a ${formatDayLong(date)}`}
        className="min-h-[124px] border-r border-b border-slate-100/70 dark:border-slate-800/70 bg-slate-50/40 dark:bg-slate-900/40 p-2 text-left text-[11px] text-slate-300 dark:text-slate-600 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
      >
        {dayNumber}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(date)}
      aria-label={ariaParts.join(' · ')}
      className={cn(
        'group relative flex min-h-[124px] flex-col gap-1.5 border-r border-b border-slate-200/80 dark:border-slate-800/80 p-2 text-left transition-colors',
        weekend ? 'bg-slate-50/70 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900',
        holiday && 'bg-rose-50/60 dark:bg-rose-950/30',
        collectiveAbsences.length > 0 && 'bg-rose-50/40 dark:bg-rose-950/20',
        selected
          ? 'z-10 ring-2 ring-indigo-500 ring-inset'
          : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold',
            today
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'text-slate-700 dark:text-slate-300',
          )}
        >
          {dayNumber}
        </span>
        <div className="flex items-center gap-1 pt-0.5">
          {handover ? (
            <span title="Passaggio: entrambi in ufficio">
              <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            </span>
          ) : null}
          {wastedNight ? (
            <span title="Notte non sfruttata: nessuna presenza nei giorni adiacenti">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            </span>
          ) : null}
          {exceptionPeople.length > 0 ? (
            <span title="Presenza senza notte adiacente (eccezione)">
              <Info className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
            </span>
          ) : null}
        </div>
      </div>

      {holiday ? (
        <div className="truncate rounded-md bg-rose-100/80 dark:bg-rose-900/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
          {holiday.name}
        </div>
      ) : null}

      {hasAbsence ? (
        <div className="flex flex-wrap gap-1">
          {collectiveAbsences.map((absence) => {
            const Icon = absenceIcons[absence.type]
            return (
              <span
                key={`closure-${absence.id}`}
                title={`${ABSENCE_SHORT_LABELS[absence.type]} per entrambi`}
                className="inline-flex items-center gap-1 rounded-md bg-rose-100/80 dark:bg-rose-900/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
              >
                <Icon className="h-3 w-3" />
                {ABSENCE_SHORT_LABELS[absence.type]}
              </span>
            )
          })}
          {personalAbsences.map(({ absence, personId }) => {
            const Icon = absenceIcons[absence.type]
            const person = getPerson(state, personId)
            return (
              <span
                key={`absence-${absence.id}`}
                title={`${ABSENCE_SHORT_LABELS[absence.type]} di ${person.name}`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400"
              >
                <Icon className="h-3 w-3" />
                {person.name}
              </span>
            )
          })}
        </div>
      ) : null}

      {nightPerson ? (
        <div
          className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: withAlpha(nightPerson.color, 0.12),
            color: nightPerson.color,
          }}
          title={`Notte in stanza: ${nightPerson.name}`}
        >
          <Moon className="h-3 w-3 shrink-0" />
          <span className="truncate">{nightPerson.name}</span>
        </div>
      ) : showFreeNight ? (
        <div className="px-1 text-[10px] text-slate-400 dark:text-slate-500">Stanza libera</div>
      ) : null}

      {present.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {present.map((person) => (
            <span
              key={`presence-${person.id}`}
              className="inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
              style={{
                backgroundColor: person.color,
                color: isLightColor(person.color) ? '#0f172a' : '#ffffff',
              }}
              title={`In ufficio: ${person.name}`}
            >
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{person.name}</span>
            </span>
          ))}
        </div>
      ) : null}

      {smartPeople.length > 0 ? (
        <div
          className="flex items-center gap-1 px-1 text-[10px] text-slate-500 dark:text-slate-400"
          title={`Smart working: ${smartPeople.map((p) => p.name).join(', ')}`}
        >
          <House className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="truncate">SW: {smartPeople.map((p) => p.name).join(' · ')}</span>
        </div>
      ) : null}
    </button>
  )
}
