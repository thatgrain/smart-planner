import { useEffect } from 'react'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { usePlanner } from './hooks/usePlanner'
import { AbsencesView } from './pages/AbsencesView'
import { CalendarView } from './pages/CalendarView'
import { IcsView } from './pages/IcsView'
import { SettingsView } from './pages/SettingsView'
import { WeeklyPatternView } from './pages/WeeklyPatternView'

export default function App() {
  const controller = usePlanner()
  const { state, month, tab, metrics, setTab, goToPreviousMonth, goToNextMonth, goToToday } =
    controller

  const warningCount = metrics.warnings.filter(
    (warning) => warning.severity === 'error' || warning.severity === 'warning',
  ).length

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        month={month}
        status={metrics.status}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
      />
      <TabBar
        active={tab}
        onChange={setTab}
        warningCount={warningCount}
        absenceCount={state.absences.length}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
        {tab === 'calendar' ? <CalendarView controller={controller} /> : null}
        {tab === 'pattern' ? <WeeklyPatternView controller={controller} /> : null}
        {tab === 'absences' ? <AbsencesView key={month} controller={controller} /> : null}
        {tab === 'ics' ? <IcsView controller={controller} /> : null}
        {tab === 'settings' ? <SettingsView controller={controller} /> : null}
      </main>

      <Footer />
    </div>
  )
}
