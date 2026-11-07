import { addDaysKey, daysInMonth, formatDayShort, monthKeyOf } from './dates'
import {
  ABSENCE_LABELS,
  getHoliday,
  getPerson,
  getPersonalAbsence,
  isCollectiveAbsence,
  isEligible,
} from './eligibility'
import { isPersonPresent } from './coverage'
import type { PersonId, PlannerState } from './types'

export type IcsFeed = PersonId | 'room'

export interface GenerateIcsOptions {
  months: string[]
  includeOffice?: boolean
  includeSmart?: boolean
  includeAbsences?: boolean
  includeHolidays?: boolean
  now?: Date
}

export interface IcsEventTypes {
  office: boolean
  smart: boolean
  absences: boolean
  holidays: boolean
}

export const DEFAULT_ICS_EVENT_TYPES: IcsEventTypes = {
  office: true,
  smart: true,
  absences: true,
  holidays: false,
}

export function toIcsOptions(eventTypes: IcsEventTypes): Omit<GenerateIcsOptions, 'months' | 'now'> {
  return {
    includeOffice: eventTypes.office,
    includeSmart: eventTypes.smart,
    includeAbsences: eventTypes.absences,
    includeHolidays: eventTypes.holidays,
  }
}

interface IcsEvent {
  uid: string
  date: string
  endDate?: string
  summary: string
  description?: string
  categories?: string
}

/**
 * Generates an RFC 5545 calendar. All events are all-day events so they are
 * not affected by daylight-saving changes in Google Calendar and Apple Calendar.
 */
export function generateIcs(
  state: PlannerState,
  feed: IcsFeed,
  options: GenerateIcsOptions,
): string {
  const months = [...new Set(options.months)].sort()
  const now = options.now ?? new Date()
  const includeOffice = options.includeOffice ?? true
  const includeSmart = options.includeSmart ?? true
  const includeAbsences = options.includeAbsences ?? true
  const includeHolidays = options.includeHolidays ?? false
  const events: IcsEvent[] = []

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
          summary: `${person.name} – Notte in stanza`,
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
        const holiday = getHoliday(state, date)
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
            summary: `${person.name} – ${ABSENCE_LABELS[absence.type]}`,
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
              summary: `${person.name} – Ufficio`,
              description: `SmartPlanner · ${formatDayShort(date)}`,
              categories: 'UFFICIO',
            })
          }
        } else if (monthPlanned && includeSmart) {
          events.push({
            uid: `sp-${personId}-sw-${date}@smartplanner`,
            date,
            endDate: addDaysKey(date, 1),
            summary: `${person.name} – Smart working`,
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
    const description = event.description ?? 'SmartPlanner'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${dtStamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(event.endDate ?? addDaysKey(event.date, 1))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      ...(event.categories ? [`CATEGORIES:${escapeIcsText(event.categories)}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

function hasPlanForMonth(state: PlannerState, month: string): boolean {
  if (state.nights.some((night) => monthKeyOf(night.date) === month && night.personId)) {
    return true
  }
  return state.absences.some(
    (absence) => monthKeyOf(absence.start) <= month && month <= monthKeyOf(absence.end),
  )
}

export function getDefaultIcsMonths(fromMonth: string, count = 12): string[] {
  const months: string[] = []
  const [year, month] = fromMonth.split('-').map(Number)
  for (let index = 0; index < count; index += 1) {
    const date = new Date(year, month - 1 + index, 1)
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function compactDate(date: string): string {
  return date.replaceAll('-', '')
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

/**
 * Folds a content line at 75 octets, as required by RFC 5545.
 */
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
