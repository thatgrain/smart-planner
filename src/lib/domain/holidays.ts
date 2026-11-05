import { addDays, format } from 'date-fns'
import type { Holiday } from './types'

const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: 'Capodanno' },
  { month: 1, day: 6, name: 'Epifania' },
  { month: 4, day: 25, name: 'Festa della Liberazione' },
  { month: 5, day: 1, name: 'Festa del Lavoro' },
  { month: 6, day: 2, name: 'Festa della Repubblica' },
  { month: 8, day: 15, name: 'Ferragosto' },
  { month: 11, day: 1, name: 'Ognissanti' },
  { month: 12, day: 8, name: 'Immacolata Concezione' },
  { month: 12, day: 25, name: 'Natale' },
  { month: 12, day: 26, name: 'Santo Stefano' },
]

/**
 * Gregorian Easter Sunday (Meeus/Jones/Butcher algorithm).
 */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function getItalianHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = FIXED_HOLIDAYS.map(({ month, day, name }) => ({
    date: format(new Date(year, month - 1, day), 'yyyy-MM-dd'),
    name,
    source: 'national' as const,
  }))

  const easterMonday = addDays(easterSunday(year), 1)
  holidays.push({
    date: format(easterMonday, 'yyyy-MM-dd'),
    name: "Lunedì dell'Angelo",
    source: 'national',
  })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

export function getItalianHolidaysForYears(years: number[]): Holiday[] {
  const byDate = new Map<string, Holiday>()
  for (const year of years) {
    for (const holiday of getItalianHolidays(year)) {
      byDate.set(holiday.date, holiday)
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeNationalHolidays(existing: Holiday[], years: number[]): Holiday[] {
  const byDate = new Map<string, Holiday>()
  for (const holiday of existing) {
    // Keep the user's custom entry if it collides with a national holiday.
    if (!byDate.has(holiday.date) || holiday.source !== 'national') {
      byDate.set(holiday.date, holiday)
    }
  }
  for (const holiday of getItalianHolidaysForYears(years)) {
    if (!byDate.has(holiday.date)) byDate.set(holiday.date, holiday)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
