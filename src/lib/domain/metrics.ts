import { addDaysKey, daysInMonth, formatDayShort, monthKeyOf } from './dates'
import {
  getPersonalAbsence,
  getPerson,
  getIneligibilityReason,
  eligibleDaysForPersonInMonth,
  isEligible,
  isWorkingDay,
} from './eligibility'
import {
  getPresenceEntry,
  isPersonPresent,
  isPresenceCoveredByNight,
} from './coverage'
import type {
  NightEntry,
  Person,
  PersonId,
  PlannerState,
  PlannerWarning,
} from './types'

export interface PersonMetrics {
  person: Person
  eligibleDays: string[]
  eligibleCount: number
  presenceDays: string[]
  presenceCount: number
  smartDays: string[]
  smartCount: number
  swPct: number
  maxSmartDays: number
  presenceNeeded: number
  capOk: boolean
  margin: number
  nights: NightEntry[]
  nightCount: number
  usefulNights: NightEntry[]
  wastedNights: NightEntry[]
  exceptionPresenceDays: string[]
  invalidPresenceDays: string[]
  absenceDays: string[]
}

export interface MonthMetrics {
  month: string
  people: Record<PersonId, PersonMetrics>
  handoverDays: string[]
  warnings: PlannerWarning[]
  assignedNights: number
  freeWorkdayNights: string[]
}

export function getPersonMetrics(
  state: PlannerState,
  personId: PersonId,
  month: string,
): PersonMetrics {
  const person = getPerson(state, personId)
  const eligibleDays = eligibleDaysForPersonInMonth(state, personId, month)
  const eligibleSet = new Set(eligibleDays)

  const monthPresenceEntries = state.presence.filter(
    (entry) => entry.personId === personId && monthKeyOf(entry.date) === month,
  )

  const presenceDays = monthPresenceEntries
    .filter((entry) => entry.status === 'present' && eligibleSet.has(entry.date))
    .map((entry) => entry.date)
    .sort()

  const invalidPresenceDays = monthPresenceEntries
    .filter((entry) => entry.status === 'present' && !eligibleSet.has(entry.date))
    .map((entry) => entry.date)
    .sort()

  const presenceSet = new Set(presenceDays)
  const smartDays = eligibleDays.filter((date) => !presenceSet.has(date))
  const eligibleCount = eligibleDays.length
  const presenceCount = presenceDays.length
  const smartCount = smartDays.length
  const swPct = eligibleCount === 0 ? 0 : (smartCount / eligibleCount) * 100

  const rawMax = (eligibleCount * state.settings.swCapPct) / 100
  const maxSmartDays = state.settings.strictCap ? Math.floor(rawMax) : Math.ceil(rawMax)
  const presenceNeeded = Math.max(0, eligibleCount - maxSmartDays)
  const capOk = smartCount <= maxSmartDays
  const margin = maxSmartDays - smartCount

  const nights = state.nights
    .filter((night) => night.personId === personId && monthKeyOf(night.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date))

  const usefulNights = nights.filter((night) => {
    const nextDate = addDaysKey(night.date, 1)
    return (
      presenceSet.has(night.date) ||
      (isPersonPresent(state, personId, nextDate) && isEligible(state, personId, nextDate))
    )
  })
  const wastedNights = nights.filter((night) => !usefulNights.includes(night))

  const exceptionPresenceDays = presenceDays.filter(
    (date) => !isPresenceCoveredByNight(state, personId, date),
  )

  const absenceDays = daysInMonth(month).filter((date) => {
    const reason = getIneligibilityReason(state, personId, date)
    return reason === 'absence' && Boolean(getPersonalAbsence(state, personId, date))
  })

  return {
    person,
    eligibleDays,
    eligibleCount,
    presenceDays,
    presenceCount,
    smartDays,
    smartCount,
    swPct,
    maxSmartDays,
    presenceNeeded,
    capOk,
    margin,
    nights,
    nightCount: nights.length,
    usefulNights,
    wastedNights,
    exceptionPresenceDays,
    invalidPresenceDays,
    absenceDays,
  }
}

export function getPersonWarnings(
  state: PlannerState,
  personId: PersonId,
  month: string,
): PlannerWarning[] {
  const metrics = getPersonMetrics(state, personId, month)
  const warnings: PlannerWarning[] = []
  const name = metrics.person.name

  if (metrics.eligibleCount > 0 && !metrics.capOk) {
    const over = metrics.smartCount - metrics.maxSmartDays
    warnings.push({
      id: `cap-${personId}-${month}`,
      severity: 'error',
      personId,
      title: `Limite smart working superato per ${name}`,
      detail: `${metrics.smartCount} giorni di SW su ${metrics.eligibleCount} (massimo ${metrics.maxSmartDays}). ${
        over === 1 ? 'Serve 1 giorno di presenza in più.' : `Servono ${over} giorni di presenza in più.`
      }`,
    })
  }

  if (metrics.eligibleCount > 0 && metrics.nightCount === 0) {
    warnings.push({
      id: `no-nights-${personId}-${month}`,
      severity: 'warning',
      personId,
      title: `Nessuna notte pianificata per ${name}`,
      detail: 'Tutte le giornate eleggibili risultano in smart working.',
    })
  }

  for (const night of metrics.wastedNights) {
    const absence = getPersonalAbsence(state, personId, night.date)
    warnings.push({
      id: `wasted-${personId}-${night.date}`,
      severity: 'warning',
      personId,
      date: night.date,
      title: `Notte del ${formatDayShort(night.date)} non sfruttata da ${name}`,
      detail: absence
        ? `La persona risulta assente (${absence.type}).`
        : 'Nessuno dei due giorni adiacenti è confermato come presenza.',
    })
  }

  for (const date of metrics.exceptionPresenceDays) {
    warnings.push({
      id: `exception-${personId}-${date}`,
      severity: 'info',
      personId,
      date,
      title: `Presenza senza notte adiacente per ${name}`,
      detail: `${formatDayShort(date)}: eccezione consentita, ma non coperta da un pernottamento.`,
    })
  }

  for (const date of metrics.invalidPresenceDays) {
    warnings.push({
      id: `invalid-presence-${personId}-${date}`,
      severity: 'warning',
      personId,
      date,
      title: `Presenza non conteggiata per ${name}`,
      detail: `${formatDayShort(date)} non è un giorno eleggibile (festivo, weekend o assenza).`,
    })
  }

  for (const night of metrics.nights) {
    const absence = getPersonalAbsence(state, personId, night.date)
    if (absence) {
      warnings.push({
        id: `night-absence-${personId}-${night.date}`,
        severity: 'warning',
        personId,
        date: night.date,
        title: `Notte assegnata durante un'assenza di ${name}`,
        detail: `${formatDayShort(night.date)}: ${absence.type}. Valuta se liberare la stanza.`,
      })
    }
  }

  return warnings
}

export function getMonthMetrics(state: PlannerState, month: string): MonthMetrics {
  const people: Record<PersonId, PersonMetrics> = {
    A: getPersonMetrics(state, 'A', month),
    B: getPersonMetrics(state, 'B', month),
  }

  const handoverDays = daysInMonth(month).filter(
    (date) =>
      isEligible(state, 'A', date) &&
      isEligible(state, 'B', date) &&
      isPersonPresent(state, 'A', date) &&
      isPersonPresent(state, 'B', date),
  )

  const freeWorkdayNights = daysInMonth(month).filter(
    (date) =>
      isWorkingDay(state, date) &&
      !state.nights.some((night) => night.date === date && night.personId !== null),
  )

  const warnings = [
    ...getPersonWarnings(state, 'A', month),
    ...getPersonWarnings(state, 'B', month),
  ].sort((a, b) => {
    const order = { error: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity] || (a.date ?? '').localeCompare(b.date ?? '')
  })

  const assignedNights = state.nights.filter(
    (night) => monthKeyOf(night.date) === month && night.personId !== null,
  ).length

  return {
    month,
    people,
    handoverDays,
    warnings,
    assignedNights,
    freeWorkdayNights,
  }
}

export function getNightBalance(metrics: MonthMetrics): {
  difference: number
  balanced: boolean
} {
  const difference = Math.abs(metrics.people.A.nightCount - metrics.people.B.nightCount)
  return { difference, balanced: difference <= 1 }
}

export function getPresenceNote(state: PlannerState, personId: PersonId, date: string) {
  return getPresenceEntry(state, personId, date)
}

export function isEligibleForPerson(state: PlannerState, personId: PersonId, date: string) {
  return isEligible(state, personId, date)
}
