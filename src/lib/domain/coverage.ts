import { addDaysKey, daysInMonth } from './dates'
import { getNight, isEligible } from './eligibility'
import type { PersonId, PlannerState, PresenceEntry } from './types'

export interface CoverageSources {
  previousNight: boolean
  sameNight: boolean
  previousNightOwner: PersonId | null
  sameNightOwner: PersonId | null
}

/**
 * A night on date D lets the person be in the office on D (arrival day)
 * and on D+1 (they wake up there). Therefore presence on date D is covered
 * by the night on D-1 or by the night on D.
 */
export function getCoverageSources(
  state: PlannerState,
  personId: PersonId,
  date: string,
): CoverageSources {
  const previousNightOwner = getNight(state, addDaysKey(date, -1))?.personId ?? null
  const sameNightOwner = getNight(state, date)?.personId ?? null

  return {
    previousNight: previousNightOwner === personId,
    sameNight: sameNightOwner === personId,
    previousNightOwner,
    sameNightOwner,
  }
}

export function isPresenceCoveredByNight(
  state: PlannerState,
  personId: PersonId,
  date: string,
): boolean {
  const coverage = getCoverageSources(state, personId, date)
  return coverage.previousNight || coverage.sameNight
}

export function getPresenceEntry(
  state: PlannerState,
  personId: PersonId,
  date: string,
): PresenceEntry | undefined {
  return state.presence.find(
    (entry) => entry.personId === personId && entry.date === date,
  )
}

export function isPersonPresent(
  state: PlannerState,
  personId: PersonId,
  date: string,
): boolean {
  return getPresenceEntry(state, personId, date)?.status === 'present'
}

export function getPresentPeople(state: PlannerState, date: string): PersonId[] {
  return state.people
    .filter((person) => isPersonPresent(state, person.id, date))
    .map((person) => person.id)
}

export function getProposedPresenceDates(
  state: PlannerState,
  personId: PersonId,
  month: string,
): string[] {
  return daysInMonth(month).filter(
    (date) =>
      isEligible(state, personId, date) && isPresenceCoveredByNight(state, personId, date),
  )
}

export function getCoverageLabel(
  state: PlannerState,
  personId: PersonId,
  date: string,
): string {
  const sources = getCoverageSources(state, personId, date)
  if (sources.previousNight && sources.sameNight) return 'Notte di ieri e di oggi'
  if (sources.previousNight) return 'Notte di ieri'
  if (sources.sameNight) return 'Notte di oggi'
  return 'Nessuna notte adiacente'
}
