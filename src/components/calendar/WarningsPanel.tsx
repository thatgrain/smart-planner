import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, XCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PlannerWarning, WarningSeverity } from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const severityStyles: Record<WarningSeverity, { icon: typeof Info; className: string }> = {
  error: { icon: XCircle, className: 'text-rose-500 dark:text-rose-400' },
  warning: { icon: AlertTriangle, className: 'text-amber-500 dark:text-amber-400' },
  info: { icon: Info, className: 'text-sky-500 dark:text-sky-400' },
}

export function WarningsPanel({
  warnings,
  onOpenDay,
}: {
  warnings: PlannerWarning[]
  onOpenDay: (date: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? warnings : warnings.slice(0, 5)
  const errors = warnings.filter((warning) => warning.severity === 'error').length
  const warningsCount = warnings.filter((warning) => warning.severity === 'warning').length

  return (
    <Card id="warnings-panel" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Avvisi del mese</h2>
            {errors > 0 ? <Badge variant="danger">{errors} errori</Badge> : null}
            {warningsCount > 0 ? <Badge variant="warning">{warningsCount}</Badge> : null}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Controlli automatici su notti, presenze, assenze e limite del 50%.
          </p>
        </div>
        {warnings.length === 0 ? <Badge variant="success">Tutto ok</Badge> : null}
      </div>

      {warnings.length === 0 ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Nessun problema rilevato. Il piano rispetta le regole impostate.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visible.map((warning) => {
            const style = severityStyles[warning.severity]
            const Icon = style.icon
            const content = (
              <>
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.className)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                    {warning.title}
                  </span>
                  {warning.detail ? (
                    <span className="mt-0.5 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      {warning.detail}
                    </span>
                  ) : null}
                </span>
              </>
            )

            return warning.date ? (
              <button
                key={warning.id}
                type="button"
                onClick={() => onOpenDay(warning.date!)}
                className="flex w-full items-start gap-2 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 text-left transition hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                {content}
              </button>
            ) : (
              <div
                key={warning.id}
                className="flex items-start gap-2 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5"
              >
                {content}
              </div>
            )
          })}
        </div>
      )}

      {warnings.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400"
        >
          {expanded ? (
            <>
              Mostra meno <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Mostra tutti ({warnings.length}) <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      ) : null}
    </Card>
  )
}
