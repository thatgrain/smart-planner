import { monthGrid, weekdayName } from '../../lib/domain/dates'
import type { PlannerState } from '../../lib/domain/types'
import { DayCell } from './DayCell'

export function MonthGrid({
  state,
  month,
  selectedDate,
  onOpenDay,
}: {
  state: PlannerState
  month: string
  selectedDate: string | null
  onOpenDay: (date: string) => void
}) {
  const cells = monthGrid(month)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
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
      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <DayCell
            key={cell.date}
            date={cell.date}
            inMonth={cell.inMonth}
            state={state}
            selected={cell.date === selectedDate}
            onOpen={onOpenDay}
          />
        ))}
      </div>
    </div>
  )
}
