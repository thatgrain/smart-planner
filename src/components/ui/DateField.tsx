import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  addMonthsToMonthKey,
  currentMonthKey,
  formatDayLong,
  formatDayNumber,
  formatItalianDate,
  formatMonthLabel,
  isTodayKey,
  monthGrid,
  monthKeyOf,
  parseItalianDate,
  todayKey,
  weekdayName,
} from '../../lib/domain/dates'
import { Button } from './Button'
import { Modal } from './Modal'

type DateFieldSize = 'sm' | 'md'

interface DateFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  size?: DateFieldSize
  disabled?: boolean
  className?: string
}

const sizeClasses: Record<DateFieldSize, string> = {
  sm: 'h-9 gap-1 px-2.5 pr-9 text-xs',
  md: 'h-10 px-3 pr-10 text-sm',
}

export function DateField({
  id,
  label,
  value,
  onChange,
  placeholder = 'gg/mm/aaaa',
  size = 'md',
  disabled = false,
  className,
}: DateFieldProps) {
  const [draft, setDraft] = useState(() => (value ? formatItalianDate(value) : ''))
  const [invalid, setInvalid] = useState(false)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    value ? monthKeyOf(value) : currentMonthKey(),
  )
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setDraft(value ? formatItalianDate(value) : '')
    setInvalid(false)
  }, [value])

  const emit = (next: string) => {
    lastEmitted.current = next
    onChange(next)
  }

  const handleInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const next =
      /^\d{8}$/.test(digits) && !/[/.-]/.test(raw)
        ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
        : raw

    setDraft(next)
    setInvalid(false)

    const parsed = parseItalianDate(next)
    emit(parsed ?? '')
  }

  const handleBlur = () => {
    const normalized = draft.trim()
    if (!normalized) {
      setInvalid(false)
      emit('')
      return
    }

    const parsed = parseItalianDate(normalized)
    if (!parsed) {
      setInvalid(true)
      emit('')
      return
    }

    setInvalid(false)
    setDraft(formatItalianDate(parsed))
    emit(parsed)
  }

  const openPicker = () => {
    if (disabled) return
    const parsedDraft = parseItalianDate(draft)
    setVisibleMonth(
      parsedDraft ? monthKeyOf(parsedDraft) : value ? monthKeyOf(value) : currentMonthKey(),
    )
    setOpen(true)
  }

  const commit = (next: string) => {
    emit(next)
    setDraft(next ? formatItalianDate(next) : '')
    setInvalid(false)
    setOpen(false)
    if (next) setVisibleMonth(monthKeyOf(next))
  }

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={draft}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border bg-white text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-300 dark:placeholder:text-slate-500',
            sizeClasses[size],
            invalid
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100 dark:border-rose-800 dark:focus:ring-rose-950'
              : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-800 dark:focus:ring-indigo-900',
          )}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label="Apri calendario"
          className={cn(
            'absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-indigo-400',
            size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
          )}
        >
          <CalendarDays className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      </div>

      {invalid ? (
        <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">
          Data non valida: usa gg/mm/aaaa.
        </p>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Seleziona data"
        description={label ? `Campo: ${label}` : 'Settimane da lunedì a domenica.'}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => commit(todayKey())}>
              Oggi
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
          </>
        }
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisibleMonth((month) => addMonthsToMonthKey(month, -1))}
            aria-label="Mese precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {formatMonthLabel(visibleMonth)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisibleMonth((month) => addMonthsToMonthKey(month, 1))}
            aria-label="Mese successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => {
            const isoDay = index + 1
            return (
              <div
                key={isoDay}
                className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
              >
                {weekdayName(isoDay, true)}
              </div>
            )
          })}

          {monthGrid(visibleMonth).map((cell) => {
            if (!cell.inMonth) return <div key={cell.date} />

            const selected = cell.date === value
            const today = isTodayKey(cell.date)

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => commit(cell.date)}
                aria-label={formatDayLong(cell.date)}
                aria-pressed={selected}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-colors',
                  selected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : today
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                )}
              >
                {formatDayNumber(cell.date)}
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
