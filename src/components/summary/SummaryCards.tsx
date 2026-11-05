import type { MonthMetrics } from '../../lib/domain/metrics'
import type { MonthInfo } from '../../lib/domain/types'
import { MonthOverviewCard } from './MonthOverviewCard'
import { PersonSummaryCard } from './PersonSummaryCard'

export function SummaryCards({
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
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <PersonSummaryCard metrics={metrics.people.A} />
      <PersonSummaryCard metrics={metrics.people.B} />
      <MonthOverviewCard
        metrics={metrics}
        monthInfo={monthInfo}
        onConfirm={onConfirm}
        onReopen={onReopen}
        onShowWarnings={onShowWarnings}
      />
    </div>
  )
}
