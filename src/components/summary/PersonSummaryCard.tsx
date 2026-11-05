import { AlertTriangle, CheckCircle2, Info, Moon } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { PersonMetrics } from '../../lib/domain/metrics'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { PersonAvatar } from '../ui/PersonAvatar'
import { ProgressBar } from '../ui/ProgressBar'

const numberFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
})

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50/80 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      {hint ? <div className="text-[10px] text-slate-400">{hint}</div> : null}
    </div>
  )
}

export function PersonSummaryCard({ metrics }: { metrics: PersonMetrics }) {
  const { person } = metrics
  const hasEligibleDays = metrics.eligibleCount > 0
  const swLabel = hasEligibleDays ? `${numberFormatter.format(metrics.swPct)}%` : 'n/d'
  const maxLabel = hasEligibleDays ? `${metrics.maxSmartDays} su ${metrics.eligibleCount}` : 'n/d'

  return (
    <Card
      className="overflow-hidden border-t-4 p-0"
      style={{ borderTopColor: person.color }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PersonAvatar person={person} size="lg" />
            <div>
              <div className="text-sm font-semibold text-slate-900">{person.name}</div>
              <div className="text-[11px] text-slate-500">
                Persona {person.id} · {metrics.nightCount} notti
              </div>
            </div>
          </div>
          <Badge variant={metrics.capOk ? 'success' : 'danger'}>
            {metrics.capOk ? 'Nei limiti' : 'Fuori limite'}
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Smart working
            </div>
            <div className="mt-0.5 text-3xl font-semibold tracking-tight text-slate-900">
              {swLabel}
            </div>
          </div>
          <div className="text-right text-[11px] leading-5 text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">{metrics.smartCount}</span> giorni SW
            </div>
            <div>
              <span className="font-semibold text-slate-700">{metrics.presenceCount}</span> presenze
            </div>
            <div>
              limite <span className="font-semibold text-slate-700">{maxLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <ProgressBar
            value={metrics.swPct}
            marker={metrics.eligibleCount > 0 ? 50 : undefined}
            color={person.color}
            over={!metrics.capOk}
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>0%</span>
            <span>50% massimo</span>
            <span>100%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Eleggibili" value={String(metrics.eligibleCount)} />
          <Stat label="Presenze" value={String(metrics.presenceCount)} />
          <Stat label="SW" value={String(metrics.smartCount)} hint={`max ${metrics.maxSmartDays}`} />
          <Stat label="Notti" value={String(metrics.nightCount)} />
          <Stat label="Eccezioni" value={String(metrics.exceptionPresenceDays.length)} />
          <Stat label="Non sfruttate" value={String(metrics.wastedNights.length)} />
        </div>

        <div className="mt-4 space-y-2">
          {!hasEligibleDays ? (
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Nessun giorno eleggibile in questo mese.
            </div>
          ) : metrics.capOk ? (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {metrics.margin === 0
                  ? 'Esattamente al limite del 50%.'
                  : `Margine residuo: ${metrics.margin} ${
                      metrics.margin === 1 ? 'giorno' : 'giorni'
                    } di SW.`}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Superato di {metrics.smartCount - metrics.maxSmartDays}{' '}
                {metrics.smartCount - metrics.maxSmartDays === 1 ? 'giorno' : 'giorni'}.
                Servono almeno {metrics.presenceNeeded} presenze.
              </span>
            </div>
          )}

          {metrics.wastedNights.length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {metrics.wastedNights.length}{' '}
                {metrics.wastedNights.length === 1 ? 'notte non sfruttata' : 'notti non sfruttate'}.
              </span>
            </div>
          ) : null}

          <div
            className={cn(
              'flex items-start gap-2 rounded-xl px-3 py-2 text-[11px]',
              metrics.exceptionPresenceDays.length > 0
                ? 'bg-sky-50 text-sky-700'
                : 'bg-slate-50 text-slate-500',
            )}
          >
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {metrics.exceptionPresenceDays.length > 0
                ? `${metrics.exceptionPresenceDays.length} ${
                    metrics.exceptionPresenceDays.length === 1
                      ? 'presenza senza notte adiacente'
                      : 'presenze senza notte adiacente'
                  }.`
                : 'Tutte le presenze sono coperte da una notte adiacente.'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
