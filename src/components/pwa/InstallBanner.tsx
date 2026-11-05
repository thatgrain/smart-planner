import { useEffect, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { Button } from '../ui/Button'

export function InstallBanner() {
  const { canInstall, isIos, isStandalone, dismissed, install, dismiss } = usePwaInstall()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 1800)
    return () => window.clearTimeout(timeout)
  }, [])

  if (!visible || isStandalone || dismissed || (!canInstall && !isIos)) return null

  const handleInstall = async () => {
    const outcome = await install()
    if (outcome !== 'unavailable') dismiss()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl shadow-slate-900/15 sp-pop-in">
        <div className="flex items-start gap-3">
          <img
            src={`${import.meta.env.BASE_URL}pwa-64x64.png`}
            alt=""
            className="h-10 w-10 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Installa SmartPlanner
                </div>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {isIos
                    ? 'Apri Safari, tocca Condividi e scegli “Aggiungi alla schermata Home”.'
                    : 'Aggiungila alla home screen per aprirla come un’app.'}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Chiudi banner installazione"
                className="rounded-lg p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIos ? (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Share className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </span>
                Condividi → Aggiungi alla schermata Home
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              {canInstall ? (
                <Button variant="primary" size="sm" onClick={() => void handleInstall()}>
                  <Download className="h-3.5 w-3.5" />
                  Installa
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={dismiss}>
                  <Smartphone className="h-3.5 w-3.5" />
                  Ho capito
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Non ora
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
