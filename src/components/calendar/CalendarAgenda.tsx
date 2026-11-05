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
}: {
  state: PlannerState
  month: string
  onOpenDay: (date: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="divide-y divide-slate-100">
        {daysInMonth(month).map((date) => {
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

          return (
            <button
              key={date}
              type="button"
              onClick={() => onOpenDay(date)}
              className={cn(
                'flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50',
                weekend && 'bg-slate-50/60',
                holiday && 'bg-rose-50/50',
              )}
            >
              <div className="w-10 shrink-0 text-center">
                <div
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                    today ? 'bg-indigo-600 text-white' : 'text-slate-700',
                  )}
                >
                  {formatDayNumber(date)}
                </div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-400">
                  {weekdayName(isoWeekday(date), true)}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                {holiday ? (
                  <div className="inline-flex max-w-full items-center gap-1 rounded-md bg-rose-100/80 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
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
                          className="inline-flex items-center gap-1 rounded-md bg-rose-100/80 px-1.5 py-0.5 text-[10px] font-medium text-rose-700"
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
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
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
                    <span className="text-[10px] text-slate-400">Stanza libera</span>
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
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                      <ArrowRightLeft className="h-3 w-3" />
                      Passaggio
                    </span>
                  ) : null}

                  {exception ? <Info className="h-3 w-3 text-sky-500" /> : null}
                  {wastedNight ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : null}
                </div>

                {smart.length > 0 ? (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <House className="h-3 w-3 shrink-0 text-slate-400" />
                    SW: {smart.map((person) => person.name).join(' · ')}
                  </div>
                ) : null}
              </div>

              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
