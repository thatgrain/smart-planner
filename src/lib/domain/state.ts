import {
  addDaysKey,
  addMonthsToMonthKey,
  currentMonthKey,
  daysInMonth,
  isoWeekday,
  monthKeyOf,
  rangeKeys,
} from './dates'
import { getPresenceEntry, isPresenceCoveredByNight } from './coverage'
import { getPersonalAbsence, isEligible } from './eligibility'
import { getItalianHolidaysForYears } from './holidays'
import type {
  Absence,
  Holiday,
  PersonId,
  PlannerSettings,
  PlannerState,
  PresenceEntry,
  WeeklyPattern,
} from './types'

export const DEFAULT_PATTERN: WeeklyPattern = {
  1: 'A',
  2: 'A',
  3: 'B',
  4: 'B',
  5: null,
  6: null,
  7: null,
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  swCapPct: 50,
  strictCap: true,
  weekendDays: [6, 7],
  allowPresenceWithoutNight: true,
  timezone: 'Europe/Rome',
}

const STATE_VERSION = 1

function presenceKey(date: string, personId: PersonId): string {
  return `${date}|${personId}`
}

function sortPresence(entries: PresenceEntry[]): PresenceEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.personId.localeCompare(b.personId),
  )
}

/**
 * Reconciles automatically derived presence entries with the current nights,
 * absences and holidays. Manual entries are never removed by this function.
 */
export function syncAutoPresence(state: PlannerState): PlannerState {
  const months = new Set<string>()

  for (const night of state.nights) {
    months.add(monthKeyOf(night.date))
    months.add(monthKeyOf(addDaysKey(night.date, 1)))
  }
  for (const entry of state.presence) {
    months.add(monthKeyOf(entry.date))
  }
  for (const absence of state.absences) {
    for (const date of rangeKeys(absence.start, absence.end)) {
      months.add(monthKeyOf(date))
    }
  }
  for (const holiday of state.holidays) {
    months.add(monthKeyOf(holiday.date))
  }

  const existing = new Map(
    state.presence.map((entry) => [presenceKey(entry.date, entry.personId), entry]),
  )
  const processed = new Set<string>()
  const result: PresenceEntry[] = []

  for (const month of months) {
    for (const person of state.people) {
      for (const date of daysInMonth(month)) {
        const key = presenceKey(date, person.id)
        processed.add(key)

        const entry = existing.get(key)
        const eligible = isEligible(state, person.id, date)
        const covered = isPresenceCoveredByNight(state, person.id, date)

        if (entry) {
          if (entry.source === 'manual') {
            result.push(entry)
          } else if (eligible && covered) {
            result.push(entry)
          }
          continue
        }

        if (eligible && covered) {
          result.push({
            date,
            personId: person.id,
            status: 'present',
            source: 'auto',
          })
        }
      }
    }
  }

  for (const entry of state.presence) {
    if (!processed.has(presenceKey(entry.date, entry.personId))) {
      result.push(entry)
    }
  }

  return { ...state, presence: sortPresence(result) }
}

export function setNight(
  state: PlannerState,
  date: string,
  personId: PersonId | null,
): PlannerState {
  const nights = state.nights.filter((night) => night.date !== date)
  if (personId !== null) {
    nights.push({ date, personId })
  }

  return syncAutoPresence({ ...state, nights })
}

export function togglePresence(
  state: PlannerState,
  date: string,
  personId: PersonId,
): PlannerState {
  const existing = getPresenceEntry(state, personId, date)
  const eligible = isEligible(state, personId, date)
  const covered = isPresenceCoveredByNight(state, personId, date)

  const wantsPresence = existing?.status !== 'present'

  if (wantsPresence) {
    if (!eligible) return state
    if (!covered && !state.settings.allowPresenceWithoutNight) return state
  }

  const presence = state.presence.filter(
    (entry) => !(entry.personId === personId && entry.date === date),
  )

  if (existing) {
    presence.push({
      ...existing,
      status: existing.status === 'present' ? 'excluded' : 'present',
      source: 'manual',
    })
  } else if (wantsPresence) {
    presence.push({
      date,
      personId,
      status: 'present',
      source: 'manual',
    })
  } else {
    presence.push({
      date,
      personId,
      status: 'excluded',
      source: 'manual',
    })
  }

  return syncAutoPresence({ ...state, presence })
}

export function resetPresenceForDay(
  state: PlannerState,
  date: string,
  personId?: PersonId,
): PlannerState {
  const presence = state.presence.filter(
    (entry) =>
      !(entry.date === date && (personId === undefined || entry.personId === personId)),
  )
  return syncAutoPresence({ ...state, presence })
}

export function applyPatternToMonth(
  state: PlannerState,
  month: string,
): PlannerState {
  const dates = daysInMonth(month)
  const patternNights = new Map(
    dates.map((date) => [date, state.pattern[isoWeekday(date)] ?? null]),
  )

  const nights = state.nights.filter((night) => monthKeyOf(night.date) !== month)
  for (const [date, personId] of patternNights) {
    if (personId !== null) {
      nights.push({ date, personId })
    }
  }

  return syncAutoPresence({ ...state, nights })
}

export function applyPatternToMonths(
  state: PlannerState,
  months: string[],
): PlannerState {
  return months.reduce((current, month) => applyPatternToMonth(current, month), state)
}

export function addAbsence(state: PlannerState, absence: Absence): PlannerState {
  if (absence.start > absence.end) return state
  return syncAutoPresence({
    ...state,
    absences: [...state.absences, absence],
  })
}

export function updateAbsence(
  state: PlannerState,
  absenceId: string,
  updates: Omit<Absence, 'id'>,
): PlannerState {
  if (updates.start > updates.end) return state
  if (!state.absences.some((item) => item.id === absenceId)) return state

  return syncAutoPresence({
    ...state,
    absences: state.absences.map((absence) =>
      absence.id === absenceId
        ? {
            ...absence,
            ...updates,
            note: updates.note?.trim() || undefined,
          }
        : absence,
    ),
  })
}

export function removeAbsence(state: PlannerState, absenceId: string): PlannerState {
  if (!state.absences.some((item) => item.id === absenceId)) return state
  return syncAutoPresence({
    ...state,
    absences: state.absences.filter((item) => item.id !== absenceId),
  })
}

export function addHoliday(state: PlannerState, holiday: Holiday): PlannerState {
  const next = syncAutoPresence({
    ...state,
    holidays: [...state.holidays.filter((item) => item.date !== holiday.date), holiday].sort(
      (a, b) => a.date.localeCompare(b.date),
    ),
  })
  return next
}

export function removeHoliday(state: PlannerState, date: string): PlannerState {
  return syncAutoPresence({
    ...state,
    holidays: state.holidays.filter((item) => item.date !== date),
  })
}

export function updateSettings(
  state: PlannerState,
  settings: Partial<PlannerSettings>,
): PlannerState {
  return syncAutoPresence({
    ...state,
    settings: { ...state.settings, ...settings },
  })
}

export function updatePerson(
  state: PlannerState,
  personId: PersonId,
  updates: { name?: string; color?: string },
): PlannerState {
  return {
    ...state,
    people: state.people.map((person) =>
      person.id === personId ? { ...person, ...updates } : person,
    ),
  }
}

export function updatePattern(
  state: PlannerState,
  weekday: number,
  personId: PersonId | null,
): PlannerState {
  return { ...state, pattern: { ...state.pattern, [weekday]: personId } }
}

export function createInitialState(now = new Date()): PlannerState {
  const year = now.getFullYear()
  const initial: PlannerState = {
    version: STATE_VERSION,
    people: [
      { id: 'A', name: 'Grano', color: '#2563eb' },
      { id: 'B', name: 'Pietro', color: '#d97706' },
    ],
    nights: [],
    presence: [],
    absences: [],
    holidays: getItalianHolidaysForYears([year, year + 1]),
    settings: { ...DEFAULT_SETTINGS },
    pattern: { ...DEFAULT_PATTERN },
  }

  const current = currentMonthKey()
  let state = initial
  for (let offset = 0; offset < 3; offset += 1) {
    state = applyPatternToMonth(state, addMonthsToMonthKey(current, offset))
  }
  return state
}

export function ensureHolidayYears(state: PlannerState, now = new Date()): PlannerState {
  const year = now.getFullYear()
  const years = [year, year + 1]
  const missingYears = years.filter(
    (candidate) =>
      !state.holidays.some(
        (holiday) =>
          holiday.date.startsWith(String(candidate)) && holiday.source === 'national',
      ),
  )

  if (missingYears.length === 0) return state

  const additions = getItalianHolidaysForYears(missingYears)
  const byDate = new Map(state.holidays.map((holiday) => [holiday.date, holiday]))
  for (const holiday of additions) {
    if (!byDate.has(holiday.date)) byDate.set(holiday.date, holiday)
  }

  return {
    ...state,
    holidays: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export function hasPersonalAbsence(
  state: PlannerState,
  personId: PersonId,
  date: string,
): boolean {
  return Boolean(getPersonalAbsence(state, personId, date))
}

export const STATE_VERSION_VALUE = STATE_VERSION
