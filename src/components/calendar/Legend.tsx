import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  House,
  Info,
  Moon,
} from 'lucide-react'

const items = [
  { icon: Moon, label: 'Notte in stanza', className: 'text-indigo-500' },
  { icon: Building2, label: 'Ufficio', className: 'text-blue-600' },
  { icon: House, label: 'Smart working', className: 'text-slate-500' },
  { icon: ArrowRightLeft, label: 'Passaggio', className: 'text-indigo-500' },
  { icon: Info, label: 'Eccezione', className: 'text-sky-500' },
  { icon: AlertTriangle, label: 'Notte non sfruttata', className: 'text-amber-500' },
]

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
      {items.map(({ icon: Icon, label, className }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${className}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
