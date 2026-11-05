import { CheckCircle2, Download, Info, Share, Smartphone } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function InstallCard() {
  const { canInstall, isIos, isStandalone, install } = usePwaInstall()

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">App sul telefono</h3>
              <Badge variant={isStandalone ? 'success' : 'neutral'}>
                {isStandalone ? 'Installata' : 'PWA'}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              {isStandalone
                ? 'SmartPlanner è installata e si apre a schermo intero.'
                : isIos
                  ? 'Su iPhone: apri Safari, tocca Condividi e scegli “Aggiungi alla schermata Home”.'
                  : 'Installa SmartPlanner per aprirla dalla home screen come un’app.'}
            </p>
          </div>
        </div>

        {isStandalone ? (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Già installata
          </div>
        ) : isIos ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">
            <Share className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Condividi → Aggiungi alla Home
          </div>
        ) : canInstall ? (
          <Button variant="primary" size="sm" onClick={() => void install()}>
            <Download className="h-3.5 w-3.5" />
            Installa app
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Dal menu del browser scegli “Installa app” (Android) o “Aggiungi alla schermata
            Home” (iPhone).
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-1.5 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Con la PWA installata puoi consultare l'ultimo piano salvato anche senza connessione, in
        sola lettura.
      </div>
    </Card>
  )
}
