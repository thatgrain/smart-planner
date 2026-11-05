import { cn } from '../../lib/cn'
import type { Person } from '../../lib/domain/types'

const sizes = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function PersonAvatar({
  person,
  size = 'md',
  className,
}: {
  person: Person
  size?: keyof typeof sizes
  className?: string
}) {
  const initial = person.name.trim().charAt(0).toUpperCase() || person.id
  return (
    <span
      title={person.name}
      style={{ backgroundColor: person.color }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white',
        sizes[size],
        className,
      )}
    >
      {initial}
    </span>
  )
}
