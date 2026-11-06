import { Fragment } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  ChevronRight,
  FileText,
  House,
  Info,
  Lock,
  Moon,
  Thermometer,
  Umbrella,
} from 'lucide-react'
import { isLightColor, withAlpha } from '../../lib/color'
import { cn } from '../../lib/cn'
import {
  addDaysKey,
  daysInMonth,
  formatDayNumber,
  isTodayKey,
  isoWeekday,
  isoWeekNumber,
  weekdayName,
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

export function CalendarAgenda({
  state,
  month,
  onOpenDay,
  readOnly = false,
}: {
  state: PlannerState
  month: string
  onOpenDay: (date: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {daysInMonth(month).map((date, index, allDates) => {
          const weekNumber = isoWeekNumber(date)
          const showWeekHeader =
            index === 0 || isoWeekNumber(allDates[index - 1]) !== weekNumber
          const today = isTodayKey(date)
          const weekend = isWeekend(state, date)
          const holiday = getHoliday(state, date)
          const night = getNight(state, date)
          const nightPerson = night?.personId ? getPerson(state, night.personId) : null
          const absences = getAbsencesForDate(state, date)
          const present = state.people.filter((person) => isPersonPresent(state, person.id, date))
          const smart = state.people.filter(
            (person) => isEligible(state, person.id, date) && !isPersonPresent(state, person.id, date),
          )
          const handover = present.length === 2
          const exception = present.some(
            (person) => !isPresenceCoveredByNight(state, person.id, date),
          )
          const nextDate = addDaysKey(date, 1)
          const wastedNight = Boolean(
            nightPerson &&
              !(
                (isPersonPresent(state, nightPerson.id, date) &&
                  isEligible(state, nightPerson.id, date)) ||
                (isPersonPresent(state, nightPerson.id, nextDate) &&
                  isEligible(state, nightPerson.id, nextDate))
              ),
          )
          const collective = absences.collective
          const personal = [
            ...absences.personal.A.map((absence) => ({ absence, personId: 'A' as const })),
            ...absences.personal.B.map((absence) => ({ absence, personId: 'B' as const })),
          ]
          const showFreeNight = !weekend && !holiday && collective.length === 0

          const rowClassName = cn(
            'flex w-full items-start gap-3 px-3 py-3 text-left transition',
            !readOnly && 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
            weekend && 'bg-slate-50/60 dark:bg-slate-900/60',
            holiday && 'bg-rose-50/50 dark:bg-rose-950/20',
          )

          const content = (
            <>
              <div className="w-10 shrink-0 text-center">
                <div
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    today ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300',
                  )}
                >
                  {formatDayNumber(date)}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {weekdayName(isoWeekday(date), true)}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                {holiday ? (
                  <div className="inline-flex max-w-full items-center gap-1 rounded-md bg-rose-100/80 dark:bg-rose-900/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300">
                    <Lock className="h-3 w-3 shrink-0" />
                    <span className="truncate">{holiday.name}</span>
                  </div>
                ) : null}

                {collective.length > 0 || personal.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {collective.map((absence) => {
                      const Icon = absenceIcons[absence.type]
                      return (
                        <span
                          key={absence.id}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-100/80 dark:bg-rose-900/50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-300"
                        >
                          <Icon className="h-3 w-3" />
                          {ABSENCE_SHORT_LABELS[absence.type]}
                        </span>
                      )
                    })}
                    {personal.map(({ absence, personId }) => {
                      const Icon = absenceIcons[absence.type]
                      const person = getPerson(state, personId)
                      return (
                        <span
                          key={absence.id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                        >
                          <Icon className="h-3 w-3" />
                          {person.name}
                        </span>
                      )
                    })}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-1">
                  {nightPerson ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: withAlpha(nightPerson.color, 0.12),
                        color: nightPerson.color,
                      }}
                    >
                      <Moon className="h-3 w-3" />
                      {nightPerson.name}
                    </span>
                  ) : showFreeNight ? (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Stanza libera</span>
                  ) : null}

                  {present.map((person) => (
                    <span
                      key={person.id}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: person.color,
                        color: isLightColor(person.color) ? '#0f172a' : '#ffffff',
                      }}
                    >
                      <Building2 className="h-3 w-3" />
                      {person.name}
                    </span>
                  ))}

                  {handover ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      <ArrowRightLeft className="h-3 w-3" />
                      Passaggio
                    </span>
                  ) : null}

                  {exception ? <Info className="h-3 w-3 text-sky-500 dark:text-sky-400" /> : null}
                  {wastedNight ? <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" /> : null}
                </div>

                {smart.length > 0 ? (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <House className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                    SW: {smart.map((person) => person.name).join(' · ')}
                  </div>
                ) : null}
              </div>

              {!readOnly ? (
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
              ) : null}
            </>
          )

          return (
            <Fragment key={date}>
              {showWeekHeader ? (
                <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1 dark:bg-slate-900/80">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    WK {weekNumber}
                  </span>
                  <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              ) : null}
              {readOnly ? (
                <div className={rowClassName}>{content}</div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDay(date)}
                  className={rowClassName}
                >
                  {content}
                </button>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
