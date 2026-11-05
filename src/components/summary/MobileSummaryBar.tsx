import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import type { MonthMetrics } from '../../lib/domain/metrics'
import type { MonthInfo } from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PersonAvatar } from '../ui/PersonAvatar'

const numberFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
})

export function MobileSummaryBar({
  metrics,
  monthInfo,
  detailsOpen,
  onToggleDetails,
  onConfirm,
}: {
  metrics: MonthMetrics
  monthInfo?: MonthInfo
  detailsOpen: boolean
  onToggleDetails: () => void
  onConfirm: () => void
}) {
  const issues = metrics.warnings.filter(
    (warning) => warning.severity === 'error' || warning.severity === 'warning',
  )
  const confirmed = metrics.status === 'confirmed'

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
              className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 px-2.5 py-2"
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
                  <span className="font-medium text-slate-700 dark:text-slate-300">{sw} SW</span>
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
          <Badge variant={confirmed ? 'success' : 'warning'}>
            {confirmed ? 'Confermato' : 'Bozza'}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {!confirmed ? (
            <Button variant="primary" size="sm" onClick={onConfirm}>
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Conferma
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onToggleDetails}>
            {detailsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            Dettagli
          </Button>
        </div>
      </div>

      {monthInfo?.confirmedAt && confirmed ? (
        <div className="mt-1 text-right text-[9px] text-slate-400 dark:text-slate-500">
          Confermato il{' '}
          {new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(monthInfo.confirmedAt))}
        </div>
      ) : null}
    </Card>
  )
}
