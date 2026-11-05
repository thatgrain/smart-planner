import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { CloudConflictScreen } from './components/cloud/CloudConflictScreen'
import { CloudErrorPage } from './components/cloud/CloudErrorPage'
import { CloudLoadingPage } from './components/cloud/CloudLoadingPage'
import { LoginPage } from './components/cloud/LoginPage'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { TabBar } from './components/layout/TabBar'
import { Button } from './components/ui/Button'
import { usePlanner } from './hooks/usePlanner'
import { AbsencesView } from './pages/AbsencesView'
import { CalendarView } from './pages/CalendarView'
import { IcsView } from './pages/IcsView'
import { SettingsView } from './pages/SettingsView'
import { WeeklyPatternView } from './pages/WeeklyPatternView'

export default function App() {
  const controller = usePlanner()
  const {
    state,
    month,
    tab,
    metrics,
    cloud,
    setTab,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
  } = controller

  const warningCount = metrics.warnings.filter(
    (warning) => warning.severity === 'error' || warning.severity === 'warning',
  ).length

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [tab])

  if (cloud.configured && cloud.active) {
    if (cloud.authLoading) return <CloudLoadingPage message="Verifica della sessione…" />

    if (!cloud.sessionEmail) return <LoginPage onSignIn={cloud.signIn} />

    if (cloud.error) {
      return (
        <CloudErrorPage
          error={cloud.error}
          onRetry={cloud.retry}
          onSignOut={cloud.signOut}
          onContinueLocal={cloud.continueLocally}
          retrying={cloud.syncStatus === 'loading'}
        />
      )
    }

    if (cloud.conflict) {
      return (
        <CloudConflictScreen
          local={cloud.conflict.local}
          remote={cloud.conflict.remote}
          remoteUpdatedAt={cloud.conflict.remoteUpdatedAt}
          onUseCloud={() => void cloud.resolveConflict('cloud')}
          onUseLocal={() => void cloud.resolveConflict('local')}
          busy={cloud.conflictBusy}
          error={cloud.syncError?.message ?? null}
        />
      )
    }

    if (!cloud.ready) return <CloudLoadingPage />
  }

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
      <TabBar
        active={tab}
        onChange={setTab}
        warningCount={warningCount}
        absenceCount={state.absences.length}
      />

      {cloud.active && cloud.ready && cloud.syncError ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 sm:px-6">
          <div className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">Salvataggio non riuscito.</span>{' '}
                {cloud.syncError.message} Le modifiche restano in questo browser.
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void cloud.syncNow()}
              className="w-fit"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Riprova
            </Button>
          </div>
        </div>
      ) : null}

      {cloud.active && cloud.message ? (
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-3 sm:px-6">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="flex-1">{cloud.message}</span>
            <button
              type="button"
              onClick={cloud.dismissMessage}
              aria-label="Chiudi messaggio"
              className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
        {tab === 'calendar' ? <CalendarView controller={controller} /> : null}
        {tab === 'pattern' ? <WeeklyPatternView controller={controller} /> : null}
        {tab === 'absences' ? <AbsencesView key={month} controller={controller} /> : null}
        {tab === 'ics' ? <IcsView controller={controller} /> : null}
        {tab === 'settings' ? <SettingsView controller={controller} /> : null}
      </main>

      <Footer cloud={cloud} />
    </div>
  )
}
