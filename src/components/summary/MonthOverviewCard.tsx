import {
  AlertTriangle,
  ArrowRightLeft,
  BedDouble,
  CalendarCheck2,
  Info,
  Lock,
  LockOpen,
  Moon,
} from 'lucide-react'
import { getNightBalance, type MonthMetrics } from '../../lib/domain/metrics'
import type { MonthInfo } from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function MonthOverviewCard({
  metrics,
  monthInfo,
  onConfirm,
  onReopen,
  onShowWarnings,
}: {
  metrics: MonthMetrics
  monthInfo?: MonthInfo
  onConfirm: () => void
  onReopen: () => void
  onShowWarnings: () => void
}) {
  const errors = metrics.warnings.filter((warning) => warning.severity === 'error').length
  const warnings = metrics.warnings.filter((warning) => warning.severity === 'warning').length
  const infos = metrics.warnings.filter((warning) => warning.severity === 'info').length
  const balance = getNightBalance(metrics)
  const confirmed = metrics.status === 'confirmed'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Riepilogo mese</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Controlla il piano prima di condividerlo
          </div>
        </div>
        <Badge variant={confirmed ? 'success' : 'warning'}>
          {confirmed ? (
            <>
              <Lock className="h-3 w-3" /> Confermato
            </>
          ) : (
            <>
              <LockOpen className="h-3 w-3" /> Bozza
            </>
          )}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
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
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Passaggi
          </div>
          <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {metrics.handoverDays.length}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">giorni con entrambi in ufficio</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Equilibrio notti</span>
          <span className={balance.balanced ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'font-medium text-amber-600 dark:text-amber-400'}>
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
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
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
          {errors + warnings + infos === 0 ? <Badge variant="success">Tutto ok</Badge> : null}
        </span>
      </button>

      {confirmed ? (
        <div className="mt-3 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          {monthInfo?.confirmedAt
            ? `Confermato il ${dateTimeFormatter.format(new Date(monthInfo.confirmedAt))}`
            : 'Piano confermato.'}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        {confirmed ? (
          <Button variant="secondary" size="sm" onClick={onReopen} className="w-full">
            <LockOpen className="h-3.5 w-3.5" />
            Riapri mese
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={onConfirm} className="w-full">
            <CalendarCheck2 className="h-3.5 w-3.5" />
            Conferma mese
          </Button>
        )}
      </div>

      {!confirmed ? (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          <Moon className="mt-0.5 h-3 w-3 shrink-0" />
          Puoi modificare il piano anche dopo la conferma: il mese tornerà in bozza.
        </div>
      ) : null}
    </Card>
  )
}
