import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './domain/state'
import {
  clearLastSeen,
  lastSeenStorageKey,
  loadLastSeen,
  saveLastSeen,
} from './lastSeen'

describe('snapshot per le novità', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('salva e ricarica la fotografia per utente', () => {
    const state = createInitialState(new Date('2026-11-01T12:00:00Z'))
    saveLastSeen('Pietro@Example.com', state)

    expect(window.localStorage.getItem(lastSeenStorageKey('pietro@example.com'))).toBeTruthy()
    expect(loadLastSeen('pietro@example.com')?.people).toEqual(state.people)
  })

  it('ignora fotografie non valide', () => {
    window.localStorage.setItem(lastSeenStorageKey('a@b.c'), '{"version":1}')
    expect(loadLastSeen('a@b.c')).toBeNull()
  })

  it('cancella la fotografia', () => {
    const state = createInitialState(new Date('2026-11-01T12:00:00Z'))
    saveLastSeen('a@b.c', state)
    clearLastSeen('a@b.c')
    expect(loadLastSeen('a@b.c')).toBeNull()
  })
})
