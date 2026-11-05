import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  RotateCcw,
} from 'lucide-react'
import { formatMonthLabel } from '../../lib/domain/dates'
import type { MonthStatus } from '../../lib/domain/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface HeaderProps {
  month: string
  status: MonthStatus
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

export function Header({
  month,
  status,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                SmartPlanner
              </h1>
              <Badge variant="neutral" className="hidden sm:inline-flex">
                <HardDrive className="h-3 w-3" />
                Locale
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Notti in stanza, presenza in ufficio e smart working
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[150px] px-2 text-center sm:min-w-[170px]">
              <div className="text-sm font-semibold text-slate-900">
                {formatMonthLabel(month)}
              </div>
              <div className="text-[11px] text-slate-500">
                {status === 'confirmed' ? 'Piano confermato' : 'Piano in bozza'}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNextMonth}
              aria-label="Mese successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="secondary" size="md" onClick={onToday}>
            <RotateCcw className="h-3.5 w-3.5" />
            Oggi
          </Button>

          <Badge
            variant={status === 'confirmed' ? 'success' : 'warning'}
            className="hidden px-2.5 py-1 sm:inline-flex"
          >
            {status === 'confirmed' ? 'Confermato' : 'Bozza'}
          </Badge>
        </div>
      </div>
    </header>
  )
}
