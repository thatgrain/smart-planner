import type { MonthMetrics } from '../../lib/domain/metrics'
import { MonthOverviewCard } from './MonthOverviewCard'
import { PersonSummaryCard } from './PersonSummaryCard'

export function SummaryCards({
  metrics,
  onShowWarnings,
}: {
  metrics: MonthMetrics
  onShowWarnings: () => void
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <PersonSummaryCard metrics={metrics.people.A} />
      <PersonSummaryCard metrics={metrics.people.B} />
      <MonthOverviewCard metrics={metrics} onShowWarnings={onShowWarnings} />
    </div>
  )
}
