import { cloudProjectRef } from './cloud'
import type { PlannerState } from './domain/types'
import { isPlannerState, normaliseState } from './storage'

const LAST_SEEN_PREFIX = 'smartplanner.lastSeen.v1'

function normaliseScope(scope: string): string {
  const value = scope.trim().toLowerCase()
  return value || 'local'
}

export function lastSeenStorageKey(scope: string): string {
  return `${LAST_SEEN_PREFIX}.${cloudProjectRef}.${normaliseScope(scope)}`
}

/**
 * Returns the planner snapshot the user saw the last time the app was opened.
 * The snapshot is stored per user and per device in localStorage: it is only
 * used to build the in-app "novità" summary, never as a source of truth.
 */
export function loadLastSeen(scope: string): PlannerState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(lastSeenStorageKey(scope))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isPlannerState(parsed)) return null
    return normaliseState(parsed)
  } catch {
    return null
  }
}

export function saveLastSeen(scope: string, state: PlannerState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(lastSeenStorageKey(scope), JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode, quota). Notifications are optional.
  }
}

export function clearLastSeen(scope: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(lastSeenStorageKey(scope))
  } catch {
    // Ignore storage errors.
  }
}
