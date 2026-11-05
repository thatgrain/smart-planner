import {
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  Repeat2,
  Settings2,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PlannerTab } from '../../lib/domain/types'

const tabs: Array<{
  id: PlannerTab
  label: string
  icon: typeof CalendarDays
}> = [
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'pattern', label: 'Settimana tipo', icon: Repeat2 },
  { id: 'absences', label: 'Assenze e festivi', icon: CalendarOff },
  { id: 'ics', label: 'Calendario ICS', icon: CalendarPlus },
  { id: 'settings', label: 'Impostazioni', icon: Settings2 },
]

export function TabBar({
  active,
  onChange,
  warningCount,
  absenceCount,
}: {
  active: PlannerTab
  onChange: (tab: PlannerTab) => void
  warningCount: number
  absenceCount: number
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Sezioni dell'app"
          className="no-scrollbar flex gap-1 overflow-x-auto py-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const selected = tab.id === active
            const badge =
              tab.id === 'calendar' ? warningCount : tab.id === 'absences' ? absenceCount : 0

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={selected}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  selected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-900/70 hover:text-slate-800 dark:hover:text-slate-100',
                )}
              >
                <Icon className={cn('h-4 w-4', selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500')} />
                {tab.label}
                {badge > 0 ? (
                  <span
                    className={cn(
                      'ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
                      tab.id === 'calendar'
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
