import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISODay,
  getISOWeek,
  isSameDay,
  parseISO,
  startOfMonth,
  subDays,
} from 'date-fns'
import { it } from 'date-fns/locale'

export const ISO_DATE_FORMAT = 'yyyy-MM-dd'
export const MONTH_FORMAT = 'yyyy-MM'

export function toDateKey(date: Date): string {
  return format(date, ISO_DATE_FORMAT)
}

export function fromDateKey(key: string): Date {
  return parseISO(key)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function monthKeyOf(value: Date | string): string {
  return typeof value === 'string' ? value.slice(0, 7) : format(value, MONTH_FORMAT)
}

/** Formats an ISO date (`YYYY-MM-DD`) as the Italian `dd/MM/yyyy`. */
export function formatItalianDate(key: string): string {
  const date = parseISO(key)
  return Number.isNaN(date.getTime()) ? '' : format(date, 'dd/MM/yyyy')
}

/**
 * Parses an Italian-style date (`dd/MM/yyyy`, `d/M/yyyy`, also with `-` or `.`
 * separators) or an ISO date. Returns `YYYY-MM-DD` or `null` when invalid.
 */
export function parseItalianDate(value: string): string | null {
  const normalized = value.trim()
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(normalized)

  if (match) {
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    const date = new Date(year, month - 1, day)

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }

    return toDateKey(date)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const date = parseISO(normalized)
    return Number.isNaN(date.getTime()) || toDateKey(date) !== normalized
      ? null
      : normalized
  }

  return null
}

export function currentMonthKey(): string {
  return monthKeyOf(new Date())
}

export function monthStart(month: string): Date {
  return startOfMonth(parseISO(`${month}-01`))
}

export function monthEnd(month: string): Date {
  return endOfMonth(monthStart(month))
}

export function daysInMonth(month: string): string[] {
  return eachDayOfInterval({ start: monthStart(month), end: monthEnd(month) }).map(toDateKey)
}

export function addDaysKey(key: string, amount: number): string {
  return toDateKey(addDays(parseISO(key), amount))
}

export function addMonthsToMonthKey(month: string, amount: number): string {
  return format(addMonths(monthStart(month), amount), MONTH_FORMAT)
}

export function isoWeekday(key: string): number {
  return getISODay(parseISO(key))
}

/** ISO 8601 week number (weeks start on Monday). */
export function isoWeekNumber(key: string): number {
  return getISOWeek(parseISO(key))
}

export function isWeekendKey(key: string, weekendDays: number[]): boolean {
  return weekendDays.includes(isoWeekday(key))
}

export function isTodayKey(key: string): boolean {
  return isSameDay(parseISO(key), new Date())
}

export function formatMonthLabel(month: string, opts?: { short?: boolean }): string {
  const date = monthStart(month)
  const value = format(date, opts?.short ? 'MMM yyyy' : 'MMMM yyyy', { locale: it })
  return capitalize(value)
}

export function formatDayLong(key: string): string {
  return capitalize(format(parseISO(key), 'EEEE d MMMM yyyy', { locale: it }))
}

export function formatDayShort(key: string): string {
  return format(parseISO(key), 'EEE d MMM', { locale: it })
}

export function formatDayNumber(key: string): string {
  return format(parseISO(key), 'd')
}

export function formatRange(start: string, end: string): string {
  if (start === end) return formatDayShort(start)
  return `${formatDayShort(start)} → ${formatDayShort(end)}`
}

export function weekdayName(isoDay: number, short = false): string {
  const names = short
    ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
    : ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  return names[isoDay - 1] ?? ''
}

export function daysBetweenInclusive(start: string, end: string): number {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
}

export function rangeKeys(start: string, end: string): string[] {
  if (start > end) return []
  return eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map(toDateKey)
}

export interface MonthGridCell {
  date: string
  inMonth: boolean
}

/**
 * Returns a Monday-first grid containing the whole month, padded with the
 * adjacent days so every week has seven cells.
 */
export function monthGrid(month: string): MonthGridCell[] {
  const first = monthStart(month)
  const leading = getISODay(first) - 1
  const start = subDays(first, leading)
  const last = monthEnd(month)
  const trailing = 7 - getISODay(last)
  const end = addDays(last, trailing)
  return eachDayOfInterval({ start, end }).map((date) => ({
    date: toDateKey(date),
    inMonth: format(date, MONTH_FORMAT) === month,
  }))
}

export function monthRangeKeys(month: string): string[] {
  return daysInMonth(month)
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
