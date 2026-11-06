import { useEffect } from 'react'
import {
  BedDouble,
  Building2,
  CalendarOff,
  PartyPopper,
  Repeat2,
  Settings2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  totalChanges,
  type ChangeCategory,
  type PlanChangeSummary,
} from '../../lib/domain/changes'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const CATEGORY_ICONS: Record<ChangeCategory, LucideIcon> = {
  nights: BedDouble,
  presence: Building2,
  absences: CalendarOff,
  holidays: PartyPopper,
  pattern: Repeat2,
  people: Users,
  settings: Settings2,
}

export function ChangesModal({
  open,
  changes,
  onClose,
}: {
  open: boolean
  changes: PlanChangeSummary[]
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  const count = totalChanges(changes)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changes-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2
              id="changes-title"
              className="text-sm font-semibold text-slate-900 dark:text-slate-50"
            >
              Novità nel piano condiviso
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {count === 1
                ? '1 modifica dall’ultimo accesso'
                : `${count} modifiche dall’ultimo accesso`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Chiudi novità">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {changes.map((change) => {
            const Icon = CATEGORY_ICONS[change.category]
            return (
              <div
                key={change.category}
                className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-800"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {change.title}
                    </span>
                    <Badge variant="info">
                      {change.count === 1 ? '1' : change.count}
                    </Badge>
                  </div>
                  {change.detail ? (
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      {change.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <Button variant="primary" size="sm" className="w-full" onClick={onClose}>
            Ho visto, chiudi
          </Button>
        </div>
      </div>
    </div>
  )
}
