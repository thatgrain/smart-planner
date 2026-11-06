import {
  AlertTriangle,
  ArrowRightLeft,
  BedDouble,
  Info,
} from 'lucide-react'
import { getNightBalance, type MonthMetrics } from '../../lib/domain/metrics'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function MonthOverviewCard({
  metrics,
  onShowWarnings,
}: {
  metrics: MonthMetrics
  onShowWarnings: () => void
}) {
  const errors = metrics.warnings.filter((warning) => warning.severity === 'error').length
  const warnings = metrics.warnings.filter((warning) => warning.severity === 'warning').length
  const infos = metrics.warnings.filter((warning) => warning.severity === 'info').length
  const balance = getNightBalance(metrics)

  return (
    <Card className="p-5">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Riepilogo mese
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Notti, passaggi e controlli automatici
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <BedDouble className="h-3.5 w-3.5" /> Notti
          </div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {metrics.assignedNights}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            {metrics.freeWorkdayNights.length} notti lavorative libere
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Passaggi
          </div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {metrics.handoverDays.length}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            giorni con entrambi in ufficio
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Equilibrio notti</span>
          <span
            className={
              balance.balanced
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'font-medium text-amber-600 dark:text-amber-400'
            }
          >
            A {metrics.people.A.nightCount} · B {metrics.people.B.nightCount}
          </span>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
          {balance.balanced
            ? 'Le notti sono bilanciate.'
            : `Differenza di ${balance.difference} notti: valuta uno scambio.`}
        </div>
      </div>

      <button
        type="button"
        onClick={onShowWarnings}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
      >
        <span className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          Avvisi del mese
        </span>
        <span className="flex items-center gap-1.5">
          {errors > 0 ? <Badge variant="danger">{errors} errori</Badge> : null}
          {warnings > 0 ? <Badge variant="warning">{warnings}</Badge> : null}
          {infos > 0 ? (
            <Badge variant="info">
              <Info className="h-3 w-3" />
              {infos}
            </Badge>
          ) : null}
          {errors + warnings + infos === 0 ? (
            <Badge variant="success">Tutto ok</Badge>
          ) : null}
        </span>
      </button>
    </Card>
  )
}
