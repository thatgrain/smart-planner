export type PersonId = 'A' | 'B'

export type AbsenceType = 'vacation' | 'sick' | 'permit' | 'closure'

export type PresenceStatus = 'present' | 'excluded'

export type PresenceSource = 'auto' | 'manual'

export interface Person {
  id: PersonId
  name: string
  /** Hex colour, e.g. #2563eb */
  color: string
}

export interface NightEntry {
  /** ISO date: YYYY-MM-DD. The night starts on this date. */
  date: string
  personId: PersonId | null
  note?: string
}

export interface PresenceEntry {
  /** ISO date: YYYY-MM-DD */
  date: string
  personId: PersonId
  status: PresenceStatus
  source: PresenceSource
  note?: string
}

export interface Absence {
  id: string
  /** null means a collective absence (valid for both people). */
  personId: PersonId | null
  /** ISO date: YYYY-MM-DD, inclusive */
  start: string
  /** ISO date: YYYY-MM-DD, inclusive */
  end: string
  type: AbsenceType
  note?: string
}

export interface Holiday {
  /** ISO date: YYYY-MM-DD */
  date: string
  name: string
  /** national holidays are seeded automatically; custom ones are user-managed. */
  source?: 'national' | 'custom'
}

export interface PlannerSettings {
  /** Maximum smart-working percentage of eligible days. */
  swCapPct: number
  /** true = floor(eligible * cap / 100), false = ceil(...) */
  strictCap: boolean
  /** ISO weekday numbers: 1 = Monday ... 7 = Sunday. */
  weekendDays: number[]
  allowPresenceWithoutNight: boolean
  timezone: string
}

/** Keys are ISO weekday numbers 1..7. */
export type WeeklyPattern = Record<number, PersonId | null>

export interface PlannerState {
  version: number
  people: Person[]
  nights: NightEntry[]
  presence: PresenceEntry[]
  absences: Absence[]
  holidays: Holiday[]
  settings: PlannerSettings
  pattern: WeeklyPattern
}

export type PlannerTab = 'calendar' | 'pattern' | 'absences' | 'ics' | 'settings'

export type WarningSeverity = 'error' | 'warning' | 'info'

export interface PlannerWarning {
  id: string
  severity: WarningSeverity
  title: string
  detail?: string
  personId?: PersonId
  date?: string
}
