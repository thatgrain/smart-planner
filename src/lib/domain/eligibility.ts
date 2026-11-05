import { daysInMonth, isWeekendKey } from './dates'
import type {
  Absence,
  AbsenceType,
  NightEntry,
  Person,
  PersonId,
  PlannerState,
} from './types'

export const ABSENCE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Ferie',
  sick: 'Malattia',
  permit: 'Permesso / ROL',
  closure: 'Chiusura aziendale',
}

export const ABSENCE_SHORT_LABELS: Record<AbsenceType, string> = {
  vacation: 'Ferie',
  sick: 'Malattia',
  permit: 'Permesso',
  closure: 'Chiusura',
}

export type IneligibilityReason = 'weekend' | 'holiday' | 'closure' | 'absence'

export function getPerson(state: PlannerState, personId: PersonId): Person {
  return state.people.find((person) => person.id === personId) ?? state.people[0]
}

export function getNight(state: PlannerState, date: string): NightEntry | undefined {
  return state.nights.find((night) => night.date === date)
}

export function getHoliday(state: PlannerState, date: string) {
  return state.holidays.find((holiday) => holiday.date === date)
}

export function isWeekend(state: PlannerState, date: string): boolean {
  return isWeekendKey(date, state.settings.weekendDays)
}

export function isHoliday(state: PlannerState, date: string): boolean {
  return Boolean(getHoliday(state, date))
}

export function isCollectiveAbsence(state: PlannerState, date: string): boolean {
  return state.absences.some(
    (absence) =>
      absence.personId === null && absence.start <= date && date <= absence.end,
  )
}

export function getPersonalAbsence(
  state: PlannerState,
  personId: PersonId,
  date: string,
): Absence | undefined {
  return state.absences.find(
    (absence) =>
      absence.personId === personId && absence.start <= date && date <= absence.end,
  )
}

export function getAbsencesForDate(
  state: PlannerState,
  date: string,
): { collective: Absence[]; personal: Record<PersonId, Absence[]> } {
  const collective: Absence[] = []
  const personal: Record<PersonId, Absence[]> = { A: [], B: [] }

  for (const absence of state.absences) {
    if (absence.start > date || date > absence.end) continue
    if (absence.personId === null) {
      collective.push(absence)
    } else {
      personal[absence.personId].push(absence)
    }
  }

  return { collective, personal }
}

export function getIneligibilityReason(
  state: PlannerState,
  personId: PersonId,
  date: string,
): IneligibilityReason | null {
  if (isWeekend(state, date)) return 'weekend'
  if (isHoliday(state, date)) return 'holiday'
  if (isCollectiveAbsence(state, date)) return 'closure'
  if (getPersonalAbsence(state, personId, date)) return 'absence'
  return null
}

export function isEligible(state: PlannerState, personId: PersonId, date: string): boolean {
  return getIneligibilityReason(state, personId, date) === null
}

export function eligibleDaysForPersonInMonth(
  state: PlannerState,
  personId: PersonId,
  month: string,
): string[] {
  return daysInMonth(month).filter((date) => isEligible(state, personId, date))
}

export function isWorkingDay(state: PlannerState, date: string): boolean {
  return (
    !isWeekend(state, date) && !isHoliday(state, date) && !isCollectiveAbsence(state, date)
  )
}

export function getEligibilityLabel(
  state: PlannerState,
  personId: PersonId,
  date: string,
): string {
  const reason = getIneligibilityReason(state, personId, date)
  if (reason === null) return 'Giorno eleggibile'
  if (reason === 'weekend') return 'Weekend'
  if (reason === 'holiday') return `Festivo: ${getHoliday(state, date)?.name ?? ''}`.trim()
  if (reason === 'closure') return 'Chiusura aziendale'
  const absence = getPersonalAbsence(state, personId, date)
  return absence ? ABSENCE_LABELS[absence.type] : 'Assenza'
}

export function getPersonAbsences(state: PlannerState, personId: PersonId | null) {
  return state.absences.filter((absence) => absence.personId === personId)
}
