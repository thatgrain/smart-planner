import { HardDrive } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mx-auto mt-10 max-w-[1400px] px-4 pb-8 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-200/70 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center">
        <span>SmartPlanner · pianificazione condivisa della stanza</span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5" />
          Fase 1 · dati salvati solo in questo browser
        </span>
      </div>
    </footer>
  )
}
