import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100',
  outline: 'border border-slate-200 bg-white text-slate-600',
}

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
