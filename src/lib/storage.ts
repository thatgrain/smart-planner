import {
  STATE_VERSION_VALUE,
  createInitialState,
  ensureHolidayYears,
  syncAutoPresence,
} from './domain/state'
import type { PlannerState } from './domain/types'

export const STORAGE_KEY = 'smartplanner.state.v1'

function looksLikeState(value: unknown): value is PlannerState {
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
    Array.isArray(state.months) &&
    Boolean(state.settings) &&
    Boolean(state.pattern)
  )
}

function normalise(state: PlannerState): PlannerState {
  const withHolidays = ensureHolidayYears(state)
  return syncAutoPresence(withHolidays)
}

export function loadState(): PlannerState {
  if (typeof window === 'undefined') return createInitialState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed: unknown = JSON.parse(raw)
    if (!looksLikeState(parsed)) return createInitialState()
    if (parsed.version !== STATE_VERSION_VALUE) return createInitialState()
    return normalise(parsed)
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
  window.localStorage.removeItem(STORAGE_KEY)
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
    if (!looksLikeState(parsed)) return null
    return normalise(parsed)
  } catch {
    return null
  }
}
