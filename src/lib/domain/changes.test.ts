import { describe, expect, it } from 'vitest'
import {
  diffPlannerStates,
  mergeChangeSummaries,
  totalChanges,
} from './changes'
import { createInitialState, setNight, updatePattern, updateSettings } from './state'
import type { Absence, PlannerState, PresenceEntry } from './types'

function baseState(): PlannerState {
  const state = createInitialState(new Date('2026-11-01T12:00:00Z'))
  return {
    ...state,
    nights: [],
    presence: [],
    absences: [],
    holidays: [],
    pattern: { 1: 'A', 2: 'A', 3: 'B', 4: 'B', 5: null, 6: null, 7: null },
  }
}

const absence: Absence = {
  id: 'absence-1',
  personId: 'A',
  start: '2026-11-10',
  end: '2026-11-11',
  type: 'vacation',
}

describe('diff del piano', () => {
  it('non segnala nulla se lo stato è identico', () => {
    expect(diffPlannerStates(baseState(), baseState())).toEqual([])
  })

  it('riassume le notti modificate', () => {
    const previous = baseState()
    const current = setNight(previous, '2026-11-02', 'B')
    const changes = diffPlannerStates(previous, current)

    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      category: 'nights',
      count: 1,
      title: 'Notte modificata',
    })
    expect(changes[0].detail).toContain('2 nov')
  })

  it('confronta solo le presenze manuali', () => {
    const previous = baseState()
    const autoPresence: PresenceEntry = {
      date: '2026-11-02',
      personId: 'A',
      status: 'present',
      source: 'auto',
    }
    const manualPresence: PresenceEntry = {
      date: '2026-11-03',
      personId: 'B',
      status: 'excluded',
      source: 'manual',
    }

    expect(
      diffPlannerStates(previous, { ...previous, presence: [autoPresence] }),
    ).toEqual([])

    const changes = diffPlannerStates(previous, {
      ...previous,
      presence: [manualPresence],
    })
    expect(changes.some((change) => change.category === 'presence')).toBe(true)
    expect(changes.find((change) => change.category === 'presence')?.detail).toContain(
      '3 nov',
    )
  })

  it('riassume le assenze aggiunte', () => {
    const previous = baseState()
    const changes = diffPlannerStates(previous, {
      ...previous,
      absences: [absence],
    })

    expect(changes[0]).toMatchObject({
      category: 'absences',
      count: 1,
      title: 'Assenza modificata',
    })
    expect(changes[0].detail).toContain('Ferie')
  })

  it('riassume pattern, impostazioni e profili', () => {
    const previous = baseState()
    let current = updatePattern(previous, 1, 'B')
    current = updateSettings(current, { swCapPct: 40 })
    current = {
      ...current,
      people: current.people.map((person) =>
        person.id === 'B' ? { ...person, name: 'Pietro Rossi' } : person,
      ),
    }

    const changes = diffPlannerStates(previous, current)
    expect(changes.map((change) => change.category)).toEqual([
      'pattern',
      'people',
      'settings',
    ])
    expect(changes.find((change) => change.category === 'pattern')?.detail).toContain(
      'Lun: Pietro',
    )
  })

  it('somma le novità mantenendo una riga per categoria', () => {
    const first = diffPlannerStates(baseState(), {
      ...baseState(),
      absences: [absence],
    })
    const second = diffPlannerStates(baseState(), {
      ...baseState(),
      absences: [{ ...absence, id: 'absence-2', start: '2026-11-20', end: '2026-11-20' }],
    })

    const merged = mergeChangeSummaries(first, second)
    expect(merged).toHaveLength(1)
    expect(merged[0].count).toBe(2)
    expect(totalChanges(merged)).toBe(2)
  })
})
