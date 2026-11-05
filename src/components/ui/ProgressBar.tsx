import { cn } from '../../lib/cn'

export function ProgressBar({
  value,
  marker,
  color,
  over = false,
  className,
}: {
  value: number
  marker?: number
  color: string
  over?: boolean
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const markerPosition = marker === undefined ? null : Math.max(0, Math.min(100, marker))

  return (
    <div className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: over ? '#e11d48' : color }}
      />
      {markerPosition !== null ? (
        <span
          aria-hidden="true"
          className="absolute top-0 h-full w-px bg-slate-500/70 dark:bg-slate-400/70"
          style={{ left: `${markerPosition}%` }}
        />
      ) : null}
    </div>
  )
}
