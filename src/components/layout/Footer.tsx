import { Cloud, HardDrive, LoaderCircle } from 'lucide-react'
import type { CloudController } from '../../hooks/usePlanner'

function statusLabel(cloud: CloudController): string {
  if (!cloud.active) return 'Locale · dati solo in questo browser'
  if (cloud.syncStatus === 'saving') return 'Cloud · salvataggio…'
  if (cloud.syncStatus === 'error') return 'Cloud · errore di sincronizzazione'
  if (cloud.syncStatus === 'loading') return 'Cloud · connessione…'
  return 'Cloud · sincronizzato'
}

export function Footer({ cloud }: { cloud: CloudController }) {
  const active = cloud.active
  return (
    <footer className="mx-auto mt-10 w-full max-w-[1400px] px-4 pb-8 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-200/70 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center">
        <span>SmartPlanner · pianificazione condivisa della stanza</span>
        <span className="inline-flex items-center gap-1.5" title={cloud.sessionEmail ?? undefined}>
          {active ? (
            cloud.syncStatus === 'saving' || cloud.syncStatus === 'loading' ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Cloud className="h-3.5 w-3.5" />
            )
          ) : (
            <HardDrive className="h-3.5 w-3.5" />
          )}
          {statusLabel(cloud)}
          {cloud.sessionEmail ? ` · ${cloud.sessionEmail}` : ''}
        </span>
      </div>
    </footer>
  )
}
