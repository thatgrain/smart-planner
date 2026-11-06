import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  LoaderCircle,
  Moon,
  RotateCcw,
  Sun,
  WifiOff,
} from 'lucide-react'
import type { CloudController } from '../../hooks/usePlanner'
import { useTheme } from '../../hooks/useTheme'
import { formatMonthLabel } from '../../lib/domain/dates'
import { Badge, type BadgeVariant } from '../ui/Badge'
import { Button } from '../ui/Button'

interface HeaderProps {
  month: string
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  cloud: CloudController
  notifications?: {
    count: number
    onOpen: () => void
  }
}

function CloudBadge({ cloud }: { cloud: CloudController }) {
  if (!cloud.active) {
    return (
      <Badge
        variant="neutral"
        title={
          cloud.configured && cloud.forceLocal
            ? 'Cloud disattivato: dati solo in questo browser'
            : 'Dati salvati solo in questo browser'
        }
      >
        <HardDrive className="h-3 w-3" />
        Locale
      </Badge>
    )
  }

  if (cloud.offline || cloud.syncStatus === 'offline') {
    return (
      <Badge variant="warning" title="Offline: ultimo piano salvato in questo browser">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    )
  }

  if (cloud.syncStatus === 'loading') {
    return (
      <Badge variant="info" title="Connessione a Supabase">
        <LoaderCircle className="h-3 w-3 animate-spin" />
        Connessione…
      </Badge>
    )
  }

  if (cloud.syncStatus === 'saving') {
    return (
      <Badge variant="warning" title="Salvataggio in corso">
        <LoaderCircle className="h-3 w-3 animate-spin" />
        Salvataggio…
      </Badge>
    )
  }

  if (cloud.syncStatus === 'error') {
    return (
      <Badge variant="danger" title="Ultimo salvataggio non riuscito">
        <AlertTriangle className="h-3 w-3" />
        Errore sync
      </Badge>
    )
  }

  const variant: BadgeVariant = 'success'
  return (
    <Badge
      variant={variant}
      title={cloud.sessionEmail ? `Sincronizzato · ${cloud.sessionEmail}` : 'Sincronizzato'}
    >
      {cloud.syncStatus === 'saved' ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Cloud className="h-3 w-3" />
      )}
      Cloud
    </Badge>
  )
}

function ThemeToggle() {
  const { isDark, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
      title={isDark ? 'Tema chiaro' : 'Tema scuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function Header({
  month,
  onPreviousMonth,
  onNextMonth,
  onToday,
  cloud,
  notifications,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-indigo-600 dark:shadow-indigo-950/30">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  SmartPlanner
                </h1>
                <CloudBadge cloud={cloud} />
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Notti in stanza, presenza in ufficio e smart working
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {notifications && notifications.count > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={notifications.onOpen}
                className="relative"
                aria-label={`Novità nel piano (${notifications.count})`}
                title="Novità dall'ultimo accesso"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-semibold leading-none text-white">
                  {notifications.count > 9 ? '9+' : notifications.count}
                </span>
              </Button>
            ) : null}
            <ThemeToggle />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[132px] px-2 text-center sm:min-w-[170px]">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {formatMonthLabel(month)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Piano del mese
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

          <Button variant="secondary" size="sm" onClick={onToday} className="px-2 sm:px-4">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Oggi</span>
          </Button>

        </div>
      </div>
    </header>
  )
}
