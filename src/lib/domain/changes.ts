import { formatDayShort, formatRange, weekdayName } from './dates'
import { ABSENCE_SHORT_LABELS } from './eligibility'
import type { PlannerState } from './types'

export type ChangeCategory =
  | 'nights'
  | 'presence'
  | 'absences'
  | 'holidays'
  | 'pattern'
  | 'people'
  | 'settings'

export interface PlanChangeSummary {
  id: ChangeCategory
  category: ChangeCategory
  title: string
  detail?: string
  count: number
}

function formatDates(dates: string[], empty = 'Nessun giorno'): string {
  if (dates.length === 0) return empty
  const visible = dates.slice(0, 3).map(formatDayShort).join(' · ')
  return dates.length > 3 ? `${visible} · …` : visible
}

function formatList(items: string[], max = 2): string {
  const visible = items.slice(0, max).join(' · ')
  return items.length > max ? `${visible} · …` : visible
}

function changedKeys(previous: Set<string>, current: Set<string>): string[] {
  return [...new Set([...previous, ...current])]
    .filter((key) => previous.has(key) !== current.has(key))
    .sort()
}

function personLabel(state: PlannerState, personId: string | null): string {
  if (personId === null) return 'Entrambi'
  return state.people.find((person) => person.id === personId)?.name ?? personId
}

/**
 * Builds a human-readable summary of the differences between two planner
 * snapshots. The function is intentionally side-effect free so it can be used
 * both for in-app notifications and for tests.
 */
export function diffPlannerStates(
  previous: PlannerState,
  current: PlannerState,
): PlanChangeSummary[] {
  const changes: PlanChangeSummary[] = []

  const previousNights = new Map(previous.nights.map((night) => [night.date, night.personId]))
  const currentNights = new Map(current.nights.map((night) => [night.date, night.personId]))
  const changedNights = [...new Set([...previousNights.keys(), ...currentNights.keys()])]
    .filter(
      (date) => (previousNights.get(date) ?? null) !== (currentNights.get(date) ?? null),
    )
    .sort()

  if (changedNights.length > 0) {
    changes.push({
      id: 'nights',
      category: 'nights',
      title: changedNights.length === 1 ? 'Notte modificata' : 'Notti modificate',
      detail: formatDates(changedNights),
      count: changedNights.length,
    })
  }

  // Only manual presence overrides are compared: automatic presence is derived
  // from nights, so a night change would otherwise be reported twice.
  const presenceSignature = (date: string, personId: string, status: string) =>
    `${date}|${personId}|${status}`
  const manualPresence = (state: PlannerState) =>
    new Set(
      state.presence
        .filter((entry) => entry.source === 'manual')
        .map((entry) => presenceSignature(entry.date, entry.personId, entry.status)),
    )
  const previousPresence = manualPresence(previous)
  const currentPresence = manualPresence(current)
  const changedPresence = changedKeys(previousPresence, currentPresence)
    .map((key) => key.split('|')[0])
    .sort()

  if (changedPresence.length > 0) {
    changes.push({
      id: 'presence',
      category: 'presence',
      title:
        changedPresence.length === 1
          ? 'Presenza in ufficio modificata'
          : 'Presenze in ufficio modificate',
      detail: formatDates([...new Set(changedPresence)]),
      count: new Set(changedPresence).size,
    })
  }

  const absenceSignature = (absence: PlannerState['absences'][number]) =>
    [
      absence.personId ?? 'all',
      absence.start,
      absence.end,
      absence.type,
      absence.note ?? '',
    ].join('|')
  const previousAbsences = new Map(
    previous.absences.map((absence) => [absence.id, absence]),
  )
  const currentAbsences = new Map(current.absences.map((absence) => [absence.id, absence]))
  const absenceIds = [
    ...new Set([...previousAbsences.keys(), ...currentAbsences.keys()]),
  ]
  const addedAbsences = absenceIds
    .filter((id) => !previousAbsences.has(id) && currentAbsences.has(id))
    .map((id) => currentAbsences.get(id)!)
  const removedAbsences = absenceIds
    .filter((id) => previousAbsences.has(id) && !currentAbsences.has(id))
    .map((id) => previousAbsences.get(id)!)
  const updatedAbsences = absenceIds
    .filter((id) => previousAbsences.has(id) && currentAbsences.has(id))
    .filter(
      (id) =>
        absenceSignature(previousAbsences.get(id)!) !==
        absenceSignature(currentAbsences.get(id)!),
    )
    .map((id) => currentAbsences.get(id)!)

  const absenceParts = [
    ...addedAbsences.map(
      (absence) =>
        `+ ${personLabel(current, absence.personId)} · ${
          ABSENCE_SHORT_LABELS[absence.type]
        } · ${formatRange(absence.start, absence.end)}`,
    ),
    ...removedAbsences.map(
      (absence) =>
        `− ${personLabel(previous, absence.personId)} · ${
          ABSENCE_SHORT_LABELS[absence.type]
        } · ${formatRange(absence.start, absence.end)}`,
    ),
    ...updatedAbsences.map(
      (absence) =>
        `~ ${personLabel(current, absence.personId)} · ${
          ABSENCE_SHORT_LABELS[absence.type]
        } · ${formatRange(absence.start, absence.end)}`,
    ),
  ]

  if (absenceParts.length > 0) {
    changes.push({
      id: 'absences',
      category: 'absences',
      title:
        absenceParts.length === 1 ? 'Assenza modificata' : 'Assenze modificate',
      detail: formatList(absenceParts),
      count: absenceParts.length,
    })
  }

  const previousHolidays = new Map(
    previous.holidays.map((holiday) => [holiday.date, holiday.name]),
  )
  const currentHolidays = new Map(
    current.holidays.map((holiday) => [holiday.date, holiday.name]),
  )
  const changedHolidays = [...new Set([...previousHolidays.keys(), ...currentHolidays.keys()])]
    .filter((date) => previousHolidays.get(date) !== currentHolidays.get(date))
    .sort()

  if (changedHolidays.length > 0) {
    changes.push({
      id: 'holidays',
      category: 'holidays',
      title: changedHolidays.length === 1 ? 'Festivo modificato' : 'Festivi modificati',
      detail: formatList(
        changedHolidays.map((date) => {
          const name = currentHolidays.get(date)
          return name ? `${formatDayShort(date)} · ${name}` : formatDayShort(date)
        }),
      ),
      count: changedHolidays.length,
    })
  }

  const weekdays = [...new Set([...Object.keys(previous.pattern), ...Object.keys(current.pattern)])]
    .map(Number)
    .sort((a, b) => a - b)
  const changedWeekdays = weekdays.filter(
    (weekday) =>
      (previous.pattern[weekday] ?? null) !== (current.pattern[weekday] ?? null),
  )

  if (changedWeekdays.length > 0) {
    changes.push({
      id: 'pattern',
      category: 'pattern',
      title: 'Settimana tipo modificata',
      detail: formatList(
        changedWeekdays.map((weekday) => {
          const personId = current.pattern[weekday] ?? null
          return `${weekdayName(weekday, true)}: ${
            personId === null ? 'libero' : personLabel(current, personId)
          }`
        }),
      ),
      count: changedWeekdays.length,
    })
  }

  const changedPeople = current.people.filter((person) => {
    const oldPerson = previous.people.find((candidate) => candidate.id === person.id)
    return (
      !oldPerson ||
      oldPerson.name !== person.name ||
      oldPerson.color !== person.color
    )
  }).length

  if (changedPeople > 0) {
    changes.push({
      id: 'people',
      category: 'people',
      title: changedPeople === 1 ? 'Profilo modificato' : 'Profili modificati',
      detail: formatList(
        current.people
          .filter((person) =>
            previous.people.some(
              (oldPerson) =>
                oldPerson.id === person.id &&
                (oldPerson.name !== person.name || oldPerson.color !== person.color),
            ),
          )
          .map((person) => person.name),
      ),
      count: changedPeople,
    })
  }

  const settingLabels: Array<[keyof PlannerState['settings'], string]> = [
    ['swCapPct', 'Limite smart working'],
    ['strictCap', 'Arrotondamento limite'],
    ['weekendDays', 'Giorni di weekend'],
    ['allowPresenceWithoutNight', 'Presenza senza notte'],
    ['timezone', 'Fuso orario'],
  ]
  const changedSettings = settingLabels.filter(([key]) => {
    const oldValue = previous.settings[key]
    const newValue = current.settings[key]
    return JSON.stringify(oldValue) !== JSON.stringify(newValue)
  })

  if (changedSettings.length > 0) {
    changes.push({
      id: 'settings',
      category: 'settings',
      title: 'Impostazioni modificate',
      detail: formatList(changedSettings.map(([, label]) => label)),
      count: changedSettings.length,
    })
  }

  return changes
}

export function mergeChangeSummaries(
  current: PlanChangeSummary[],
  incoming: PlanChangeSummary[],
): PlanChangeSummary[] {
  const merged = new Map<ChangeCategory, PlanChangeSummary>()
  for (const change of [...current, ...incoming]) {
    const existing = merged.get(change.category)
    if (!existing) {
      merged.set(change.category, change)
      continue
    }
    merged.set(change.category, {
      ...existing,
      title: change.title,
      detail: change.detail ?? existing.detail,
      count: existing.count + change.count,
    })
  }
  return [...merged.values()]
}

export function totalChanges(changes: PlanChangeSummary[]): number {
  return changes.reduce((total, change) => total + change.count, 0)
}
