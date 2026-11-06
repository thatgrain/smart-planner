import {
  STATE_VERSION_VALUE,
  createInitialState,
  ensureHolidayYears,
  syncAutoPresence,
} from './domain/state'
import type { PlannerState } from './domain/types'

export const STORAGE_KEY = 'smartplanner.state.v1'

export function isPlannerState(value: unknown): value is PlannerState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<PlannerState>
  return (
    typeof state.version === 'number' &&
    Array.isArray(state.people) &&
    state.people.length === 2 &&
    state.people.some((person) => person.id === 'A') &&
    state.people.some((person) => person.id === 'B') &&
    Array.isArray(state.nights) &&
    Array.isArray(state.presence) &&
    Array.isArray(state.absences) &&
    Array.isArray(state.holidays) &&
    Boolean(state.settings) &&
    Boolean(state.pattern)
  )
}

function migrateDefaultNames(state: PlannerState): PlannerState {
  return {
    ...state,
    people: state.people.map((person) => {
      if (person.id === 'A' && person.name === 'Massi') return { ...person, name: 'Grano' }
      if (person.id === 'B' && person.name === 'Collega') return { ...person, name: 'Pietro' }
      return person
    }),
  }
}

export function normaliseState(state: PlannerState): PlannerState {
  const clean = { ...state } as PlannerState & { months?: unknown }
  delete clean.months
  const migrated = migrateDefaultNames(clean)
  const withHolidays = ensureHolidayYears(migrated)
  return syncAutoPresence(withHolidays)
}

export function hasStoredState(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

export function loadState(): PlannerState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed: unknown = JSON.parse(raw)
    if (!isPlannerState(parsed)) return createInitialState()
    if (parsed.version !== STATE_VERSION_VALUE) return createInitialState()
    return normaliseState(parsed)
  } catch {
    return createInitialState()
  }
}

export function saveState(state: PlannerState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode, quota). The app keeps working in memory.
  }
}

export function clearStoredState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export function resetToDemoState(): PlannerState {
  const state = createInitialState()
  saveState(state)
  return state
}

export function serialiseState(state: PlannerState): string {
  return JSON.stringify(state, null, 2)
}

export function parseImportedState(raw: string): PlannerState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPlannerState(parsed)) return null
    return normaliseState(parsed)
  } catch {
    return null
  }
}
