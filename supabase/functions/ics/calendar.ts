/**
 * Pure iCalendar generator for the SmartPlanner subscription feed.
 *
 * This module intentionally has no Deno or npm dependencies: it is bundled by
 * the Supabase Edge Function and can also be unit-tested with Vitest.
 */

export type PersonId = 'A' | 'B'
export type FeedId = PersonId | 'room'

export interface FeedPerson {
  id: PersonId
  name: string
  color?: string
}

export interface FeedNight {
  date: string
  personId: PersonId | null
}

export interface FeedPresence {
  date: string
  personId: PersonId
  status: 'present' | 'excluded'
}

export interface FeedAbsence {
  id: string
  personId: PersonId | null
  start: string
  end: string
  type: string
  note?: string
}

export interface FeedHoliday {
  date: string
  name: string
}

export interface FeedState {
  people: FeedPerson[]
  nights: FeedNight[]
  presence: FeedPresence[]
  absences: FeedAbsence[]
  holidays: FeedHoliday[]
  settings?: {
    weekendDays?: number[]
  }
}

export interface GenerateCalendarOptions {
  months?: string[]
  now?: Date
  includeOffice?: boolean
  includeSmart?: boolean
  includeAbsences?: boolean
  includeHolidays?: boolean
}

interface FeedEvent {
  uid: string
  date: string
  endDate?: string
  summary: string
  description?: string
  categories?: string
}

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MONTHS_SHORT = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
]

const ABSENCE_LABELS: Record<string, string> = {
  vacation: 'Ferie',
  sick: 'Malattia',
  permit: 'Permesso / ROL',
  closure: 'Chiusura aziendale',
}

export function generateCalendar(
  state: FeedState,
  feed: FeedId,
  options: GenerateCalendarOptions = {},
): string {
  const now = options.now ?? new Date()
  const months = options.months ?? getFeedMonths(state, now)
  const includeOffice = options.includeOffice ?? true
  const includeSmart = options.includeSmart ?? true
  const includeAbsences = options.includeAbsences ?? true
  const includeHolidays = options.includeHolidays ?? false
  const events: FeedEvent[] = []

  if (feed === 'room') {
    for (const month of months) {
      for (const date of daysInMonth(month)) {
        const night = state.nights.find((item) => item.date === date)
        if (!night?.personId) continue
        const person = getPerson(state, night.personId)
        events.push({
          uid: `sp-room-${date}@smartplanner`,
          date,
          endDate: addDaysKey(date, 1),
          summary: `Notte in stanza – ${person.name}`,
          description: 'Pernottamento registrato su SmartPlanner.',
          categories: 'STANZA',
        })
      }
    }
  } else {
    const personId = feed
    const person = getPerson(state, personId)

    for (const month of months) {
      const monthPlanned = hasPlanForMonth(state, month)

      for (const date of daysInMonth(month)) {
        const holiday = state.holidays.find((item) => item.date === date)
        const collective = isCollectiveAbsence(state, date)
        const absence = getPersonalAbsence(state, personId, date)
        const eligible = isEligible(state, personId, date)
        const present = isPersonPresent(state, personId, date)

        if (includeAbsences && collective) {
          events.push({
            uid: `sp-${personId}-closure-${date}@smartplanner`,
            date,
            endDate: addDaysKey(date, 1),
            summary: 'Chiusura aziendale',
            description: 'SmartPlanner',
            categories: 'ASSENZA',
          })
        }

        if (includeAbsences && absence) {
          events.push({
            uid: `sp-${personId}-absence-${absence.id}-${date}@smartplanner`,
            date,
            endDate: addDaysKey(date, 1),
            summary: `${ABSENCE_LABELS[absence.type] ?? 'Assenza'} – ${person.name}`,
            description: absence.note ? `SmartPlanner · ${absence.note}` : 'SmartPlanner',
            categories: 'ASSENZA',
          })
        }

        if (includeHolidays && holiday) {
          events.push({
            uid: `sp-${personId}-holiday-${date}@smartplanner`,
            date,
            endDate: addDaysKey(date, 1),
            summary: `Festivo – ${holiday.name}`,
            description: 'Festività italiana',
            categories: 'FESTIVO',
          })
        }

        if (!eligible) continue

        if (present) {
          if (includeOffice) {
            events.push({
              uid: `sp-${personId}-office-${date}@smartplanner`,
              date,
              endDate: addDaysKey(date, 1),
              summary: `Ufficio – ${person.name}`,
              description: `SmartPlanner · ${formatDayShort(date)}`,
              categories: 'UFFICIO',
            })
          }
        } else if (monthPlanned && includeSmart) {
          events.push({
            uid: `sp-${personId}-sw-${date}@smartplanner`,
            date,
            endDate: addDaysKey(date, 1),
            summary: `Smart working – ${person.name}`,
            description: `SmartPlanner · ${formatDayShort(date)}`,
            categories: 'SMART WORKING',
          })
        }
      }
    }
  }

  const calendarName =
    feed === 'room' ? 'SmartPlanner – Stanza' : `SmartPlanner – ${getPerson(state, feed).name}`

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartPlanner//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    `X-WR-CALDESC:${escapeIcsText('Notti in stanza, presenza in ufficio e smart working')}`,
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ]

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${dtStamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(event.endDate ?? addDaysKey(event.date, 1))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description ?? 'SmartPlanner')}`,
      ...(event.categories ? [`CATEGORIES:${escapeIcsText(event.categories)}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/**
 * All months with data, plus a small window around the current month.
 */
export function getFeedMonths(state: FeedState, now = new Date()): string[] {
  const months = new Set<string>()

  for (let offset = -1; offset <= 2; offset += 1) {
    months.add(addMonthsToMonthKey(monthKeyOf(formatDateKey(now)), offset))
  }

  for (const night of state.nights) months.add(monthKeyOf(night.date))
  for (const entry of state.presence) months.add(monthKeyOf(entry.date))
  for (const absence of state.absences) {
    for (const month of monthsBetween(absence.start, absence.end)) months.add(month)
  }

  return [...months].sort()
}

function getPerson(state: FeedState, personId: PersonId): FeedPerson {
  return (
    state.people.find((person) => person.id === personId) ?? {
      id: personId,
      name: personId,
    }
  )
}

function hasPlanForMonth(state: FeedState, month: string): boolean {
  if (state.nights.some((night) => monthKeyOf(night.date) === month && night.personId)) {
    return true
  }
  return state.absences.some(
    (absence) => monthKeyOf(absence.start) <= month && month <= monthKeyOf(absence.end),
  )
}

function isEligible(state: FeedState, personId: PersonId, date: string): boolean {
  const weekendDays = state.settings?.weekendDays ?? [6, 7]
  if (weekendDays.includes(isoWeekday(date))) return false
  if (state.holidays.some((holiday) => holiday.date === date)) return false
  if (
    state.absences.some(
      (absence) =>
        absence.personId === null && absence.start <= date && date <= absence.end,
    )
  ) {
    return false
  }
  if (getPersonalAbsence(state, personId, date)) return false
  return true
}

function isCollectiveAbsence(state: FeedState, date: string): boolean {
  return state.absences.some(
    (absence) =>
      absence.personId === null && absence.start <= date && date <= absence.end,
  )
}

function getPersonalAbsence(
  state: FeedState,
  personId: PersonId,
  date: string,
): FeedAbsence | undefined {
  return state.absences.find(
    (absence) =>
      absence.personId === personId && absence.start <= date && date <= absence.end,
  )
}

function isPersonPresent(state: FeedState, personId: PersonId, date: string): boolean {
  return state.presence.some(
    (entry) =>
      entry.personId === personId && entry.date === date && entry.status === 'present',
  )
}

function dateParts(key: string): [number, number, number] {
  const [year, month, day] = key.split('-').map(Number)
  return [year, month, day]
}

function dateToUtc(key: string): Date {
  const [year, month, day] = dateParts(key)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function addDaysKey(key: string, amount: number): string {
  const date = dateToUtc(key)
  date.setUTCDate(date.getUTCDate() + amount)
  return formatDateKey(date)
}

function addMonthsToMonthKey(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

function monthsBetween(start: string, end: string): string[] {
  const months: string[] = []
  let current = monthKeyOf(start)
  const last = monthKeyOf(end)
  while (current <= last && months.length < 60) {
    months.push(current)
    current = addMonthsToMonthKey(current, 1)
  }
  return months
}

function daysInMonth(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return Array.from({ length: count }, (_, index) => `${month}-${pad(index + 1)}`)
}

function isoWeekday(key: string): number {
  const day = dateToUtc(key).getUTCDay()
  return day === 0 ? 7 : day
}

function monthKeyOf(date: string): string {
  return date.slice(0, 7)
}

function formatDayShort(key: string): string {
  const date = dateToUtc(key)
  return `${WEEKDAYS_SHORT[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function compactDate(key: string): string {
  return key.replaceAll('-', '')
}

function dtStamp(date: Date): string {
  return date
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}/, '')
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
}

function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line

  const chunks: string[] = []
  let current = ''
  let currentLength = 0

  for (const char of line) {
    const charLength = encoder.encode(char).length
    if (currentLength + charLength > 75) {
      chunks.push(current)
      current = char
      currentLength = charLength
    } else {
      current += char
      currentLength += charLength
    }
  }
  if (current) chunks.push(current)

  return chunks.join('\r\n ')
}
