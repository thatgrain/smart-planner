import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../../hooks/useTheme'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const options: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: 'system', label: 'Sistema', icon: Monitor },
  { id: 'light', label: 'Chiaro', icon: Sun },
  { id: 'dark', label: 'Scuro', icon: Moon },
]

export function ThemeCard() {
  const { preference, setPreference } = useTheme()

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Aspetto</h3>
            <Badge variant="neutral">Solo questo dispositivo</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
            Scegli se seguire il tema del sistema operativo oppure forzare chiaro o scuro.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {options.map(({ id, label, icon: Icon }) => {
          const active = preference === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreference(id)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition',
                active
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
