import { Info, RefreshCw, WifiOff } from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { cn } from '../lib/cn'
import { formatMonthLabel } from '../lib/domain/dates'
import { CalendarAgenda } from '../components/calendar/CalendarAgenda'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PersonAvatar } from '../components/ui/PersonAvatar'

const numberFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
})

export function OfflineView({ controller }: { controller: PlannerController }) {
  const {
    state,
    month,
    metrics,
    cloud,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  } = controller

  const issues = metrics.warnings.filter(
    (warning) => warning.severity === 'error' || warning.severity === 'warning',
  ).length

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        month={month}
        status={metrics.status}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        cloud={cloud}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:flex-row sm:items-center">
          <WifiOff className="h-4 w-4 shrink-0" />
          <div className="flex-1 leading-5">
            <span className="font-semibold">Sei offline.</span> Stai vedendo l'ultimo piano
            salvato in questo browser. Le modifiche non sono disponibili finché non torni online.
          </div>
          <Button variant="secondary" size="sm" onClick={cloud.retryCloud}>
            <RefreshCw className="h-3.5 w-3.5" />
            Riprova
          </Button>
        </div>

        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {formatMonthLabel(month)}
              </div>
              <div className="text-[10px] text-slate-400">
                Ultimo piano disponibile offline
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              {issues > 0
                ? `${issues} ${issues === 1 ? 'avviso' : 'avvisi'}`
                : 'Nessun avviso'}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map((personId) => {
              const personMetrics = metrics.people[personId]
              const sw =
                personMetrics.eligibleCount > 0
                  ? `${numberFormatter.format(personMetrics.swPct)}%`
                  : 'n/d'

              return (
                <div
                  key={personId}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2"
                >
                  <PersonAvatar person={personMetrics.person} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold text-slate-800">
                      {personMetrics.person.name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          personMetrics.capOk ? 'bg-emerald-500' : 'bg-rose-500',
                        )}
                      />
                      <span className="font-medium text-slate-700">{sw} SW</span>
                      <span className="text-slate-400">
                        · {personMetrics.presenceCount}/{personMetrics.eligibleCount}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <div className="mt-4">
          <CalendarAgenda state={state} month={month} onOpenDay={() => {}} readOnly />
        </div>

        <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          I dati sono una copia locale dell'ultima sincronizzazione. Quando torni online l'app
          ricarica il piano condiviso e riattiva le modifiche.
        </div>
      </main>

      <Footer cloud={cloud} />
    </div>
  )
}
