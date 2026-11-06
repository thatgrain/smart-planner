import { Bell, ChevronRight, X } from 'lucide-react'
import { totalChanges, type PlanChangeSummary } from '../../lib/domain/changes'
import { Button } from '../ui/Button'

export function ChangesBanner({
  changes,
  onOpen,
  onDismiss,
}: {
  changes: PlanChangeSummary[]
  onOpen: () => void
  onDismiss: () => void
}) {
  if (changes.length === 0) return null

  const count = totalChanges(changes)

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 sm:px-6">
      <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
        <div className="flex items-start gap-2">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="leading-5">
            <span className="font-semibold">
              {count === 1 ? '1 novità' : `${count} novità`} dal tuo ultimo accesso
            </span>
            <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-300">
              {changes.map((change) => (
                <span
                  key={change.category}
                  className="rounded-full bg-white/70 px-2 py-0.5 font-medium dark:bg-indigo-900/50"
                >
                  {change.title}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={onOpen}>
            Mostra
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Nascondi novità"
            className="rounded-lg p-1.5 text-indigo-500 transition hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
