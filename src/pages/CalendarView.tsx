import { useRef, useState } from 'react'
import { ArrowRightLeft, CalendarOff, Repeat2, Sparkles, X } from 'lucide-react'
import type { PlannerController } from '../hooks/usePlanner'
import { formatMonthLabel } from '../lib/domain/dates'
import { CalendarAgenda } from '../components/calendar/CalendarAgenda'
import { DayDrawer } from '../components/calendar/DayDrawer'
import { Legend } from '../components/calendar/Legend'
import { MonthGrid } from '../components/calendar/MonthGrid'
import { WarningsPanel } from '../components/calendar/WarningsPanel'
import { MobileSummaryBar } from '../components/summary/MobileSummaryBar'
import { SummaryCards } from '../components/summary/SummaryCards'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function CalendarView({ controller }: { controller: PlannerController }) {
  const { state, month, metrics, selectedDate, openDay, closeDay, actions, setTab } = controller
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailsRef = useRef<HTMLDivElement>(null)
  const monthInfo = state.months.find((info) => info.month === month)

  const showWarnings = () => {
    document.getElementById('warnings-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleDetails = () => {
    const next = !detailsOpen
    setDetailsOpen(next)
    if (next) {
      window.setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }

  return (
    <div className="space-y-5">
      <div className="hidden rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/80 via-white to-white p-5 shadow-soft lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Piano del mese
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            {formatMonthLabel(month)}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Assegna le notti, controlla le presenze proposte e verifica il limite del 50% di
            smart working. Clicca un giorno per modificare il dettaglio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setTab('pattern')}>
            <Repeat2 className="h-3.5 w-3.5" />
            Settimana tipo
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setTab('absences')}>
            <CalendarOff className="h-3.5 w-3.5" />
            Assenze e festivi
          </Button>
        </div>
      </div>

      <div className="lg:hidden">
        <MobileSummaryBar
          metrics={metrics}
          monthInfo={monthInfo}
          detailsOpen={detailsOpen}
          onToggleDetails={toggleDetails}
          onConfirm={actions.confirmMonth}
        />
      </div>

      <div className="hidden lg:block">
        <SummaryCards
          metrics={metrics}
          monthInfo={monthInfo}
          onConfirm={actions.confirmMonth}
          onReopen={actions.reopenMonth}
          onShowWarnings={showWarnings}
        />
      </div>

      <div className="space-y-2">
        <div className="hidden flex-col gap-2 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Calendario</h2>
            <p className="text-[11px] text-slate-500">
              Notte, ufficio e smart working in un'unica vista.
            </p>
          </div>
          <Legend />
        </div>
        <div className="hidden md:block">
          <MonthGrid
            state={state}
            month={month}
            selectedDate={selectedDate}
            onOpenDay={openDay}
          />
        </div>
        <div className="md:hidden">
          <CalendarAgenda state={state} month={month} onOpenDay={openDay} />
        </div>
        <div className="hidden items-start gap-1.5 text-[10px] text-slate-400 sm:flex">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          Le presenze automatiche sono proposte dal sistema in base alle notti adiacenti. Puoi
          modificarle o escluderle dal dettaglio del giorno.
        </div>
      </div>

      {detailsOpen ? (
        <div ref={detailsRef} className="space-y-4 scroll-mt-20 lg:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Riepilogo e avvisi</h2>
              <p className="text-[11px] text-slate-500">
                Dettagli del mese, limiti e controlli automatici.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={toggleDetails}>
              <X className="h-3.5 w-3.5" />
              Chiudi
            </Button>
          </div>
          <SummaryCards
            metrics={metrics}
            monthInfo={monthInfo}
            onConfirm={actions.confirmMonth}
            onReopen={actions.reopenMonth}
            onShowWarnings={showWarnings}
          />
          <WarningsPanel warnings={metrics.warnings} onOpenDay={openDay} />
        </div>
      ) : null}

      <div className="hidden lg:block">
        <WarningsPanel warnings={metrics.warnings} onOpenDay={openDay} />
      </div>

      <div className="hidden gap-3 sm:grid-cols-3 lg:grid">
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-900">Notte → presenza</div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Una notte copre il giorno stesso (arrivo) e il giorno dopo (si dorme lì). Un blocco
            di <span className="font-medium text-slate-700">k notti</span> produce fino a{' '}
            <span className="font-medium text-slate-700">k + 1</span> giorni di presenza.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />
            Giorno di passaggio
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Con A lun–mer e B mer–ven, il mercoledì entrambi sono in ufficio: A parte, B arriva.
            La stanza resta occupata da una persona sola per notte.
          </p>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-slate-900">Calcolo del 50%</div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Giorni eleggibili = feriali − festivi − assenze. Il massimo di SW è il 50% arrotondato
            per difetto; weekend e assenze non entrano nel calcolo.
          </p>
        </Card>
      </div>

      <DayDrawer
        date={selectedDate}
        state={state}
        onClose={closeDay}
        onSetNight={actions.setNight}
        onTogglePresence={actions.togglePresence}
        onResetPresence={actions.resetPresence}
        onManageAbsences={() => {
          closeDay()
          setTab('absences')
        }}
      />
    </div>
  )
}
