import { CalendarDays, LoaderCircle } from 'lucide-react'

export function CloudLoadingPage({ message = 'Sincronizzazione del piano…' }: { message?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
        <CalendarDays className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">SmartPlanner</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-xs text-slate-500">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          {message}
        </p>
      </div>
    </div>
  )
}
