import { Fragment } from 'react'
import { Info } from 'lucide-react'
import {
  isoWeekNumber,
  monthGrid,
  weekdayName,
  type MonthGridCell,
} from '../../lib/domain/dates'
import type { PlannerState } from '../../lib/domain/types'
import { DayCell } from './DayCell'

const gridColumns =
  'grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(7,minmax(0,1fr))]'

export function MonthGrid({
  state,
  month,
  selectedDate,
  onOpenDay,
  onNavigateMonth,
}: {
  state: PlannerState
  month: string
  selectedDate: string | null
  onOpenDay: (date: string) => void
  onNavigateMonth: (month: string) => void
}) {
  const cells = monthGrid(month)
  const weeks: MonthGridCell[][] = []

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
      <div
        className={`${gridColumns} border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80`}
      >
        <div
          className="px-1 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500"
          title="Numero della settimana ISO"
        >
          WK
        </div>
        {Array.from({ length: 7 }, (_, index) => {
          const isoDay = index + 1
          const weekend = state.settings.weekendDays.includes(isoDay)
          return (
            <div
              key={isoDay}
              className={
                'px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px] ' +
                (weekend ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400')
              }
            >
              {weekdayName(isoDay, true)}
            </div>
          )
        })}
      </div>
      <div className={gridColumns}>
        {weeks.map((week) => {
          const weekNumber = isoWeekNumber(week[0].date)
          return (
            <Fragment key={week[0].date}>
              <div
                className="flex min-h-[124px] flex-col items-center border-r border-b border-slate-200/80 px-1 pt-2 dark:border-slate-800/80"
                title={`Settimana ISO ${weekNumber}`}
              >
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  WK
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {weekNumber}
                </span>
              </div>
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  date={cell.date}
                  inMonth={cell.inMonth}
                  state={state}
                  selected={cell.date === selectedDate}
                  onOpen={onOpenDay}
                  onNavigateMonth={onNavigateMonth}
                />
              ))}
            </Fragment>
          )
        })}
      </div>
      <div className="flex items-center gap-1.5 border-t border-slate-200/70 px-3 py-2 text-[10px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
        <Info className="h-3 w-3 shrink-0" />
        I giorni attenuati appartengono al mese precedente o successivo: clicca per aprire quel
        mese, poi modifica il giorno.
      </div>
    </div>
  )
}
