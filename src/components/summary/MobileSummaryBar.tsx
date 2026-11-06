import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { MonthMetrics } from '../../lib/domain/metrics'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PersonAvatar } from '../ui/PersonAvatar'

const numberFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
})

export function MobileSummaryBar({
  metrics,
  detailsOpen,
  onToggleDetails,
}: {
  metrics: MonthMetrics
  detailsOpen: boolean
  onToggleDetails: () => void
}) {
  const issues = metrics.warnings.filter(
    (warning) => warning.severity === 'error' || warning.severity === 'warning',
  )

  return (
    <Card className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((personId) => {
          const personMetrics = metrics.people[personId]
          const sw =
            personMetrics.eligibleCount > 0
              ? `${numberFormatter.format(personMetrics.swPct)}%`
              : 'n/d'

          return (
            <div
              key={personId}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <PersonAvatar person={personMetrics.person} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  {personMetrics.person.name}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      personMetrics.capOk ? 'bg-emerald-500' : 'bg-rose-500',
                    )}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {sw} SW
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    · {personMetrics.presenceCount}/{personMetrics.eligibleCount}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {issues.length > 0 ? (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              {issues.length} {issues.length === 1 ? 'avviso' : 'avvisi'}
            </Badge>
          ) : (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" />
              Tutto ok
            </Badge>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={onToggleDetails}>
          {detailsOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          Dettagli
        </Button>
      </div>
    </Card>
  )
}
