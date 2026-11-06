import { Bell, ChevronRight, X } from 'lucide-react'
import { totalChanges, type PlanChangeSummary } from '../../lib/domain/changes'

export function ChangesToast({
  changes,
  onOpen,
  onDismiss,
}: {
  changes: PlanChangeSummary[] | null
  onOpen: () => void
  onDismiss: () => void
}) {
  if (!changes || changes.length === 0) return null

  const count = totalChanges(changes)

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex justify-center sm:bottom-5">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-50">
            Piano aggiornato
          </div>
          <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            {count === 1 ? '1 modifica' : `${count} modifiche`} appena sincronizzate:{' '}
            {changes.map((change) => change.title).join(' · ')}
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
          >
            Vedi dettagli
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Chiudi notifica"
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
