import {
  AlertTriangle,
  Database,
  HardDrive,
  LoaderCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import type { CloudErrorInfo } from '../../lib/cloud'
import { Button } from '../ui/Button'

export function CloudErrorPage({
  error,
  onRetry,
  onSignOut,
  onContinueLocal,
  retrying = false,
}: {
  error: CloudErrorInfo
  onRetry: () => void
  onSignOut: () => void
  onContinueLocal: () => void
  retrying?: boolean
}) {
  const isDatabaseError = error.code === 'TABLE_MISSING' || error.code === '42P01'

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            {isDatabaseError ? <Database className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">{error.title}</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">{error.message}</p>
          </div>
        </div>

        {error.hint ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-600">
            {error.hint}
          </div>
        ) : null}

        {isDatabaseError ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2.5 font-mono text-[10px] text-slate-200">
            supabase/migrations/0001_init.sql
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {error.canRetry ? (
            <Button variant="primary" onClick={onRetry} disabled={retrying} className="flex-1">
              {retrying ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Riprova
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onSignOut} className="flex-1">
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
          <Button variant="ghost" onClick={onContinueLocal} className="flex-1">
            <HardDrive className="h-4 w-4" />
            Modalità locale
          </Button>
        </div>

        <p className="mt-4 text-center text-[10px] leading-4 text-slate-400">
          La modalità locale usa solo i dati di questo browser e non sincronizza con Pietro.
        </p>
      </div>
    </div>
  )
}
