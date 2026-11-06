import { describe, expect, it } from 'vitest'
import { generateIcs } from '../../../src/lib/domain/ics'
import type { PlannerState } from '../../../src/lib/domain/types'
import { generateCalendar } from './calendar'

const NOVEMBER = '2026-11'
const now = new Date('2026-11-05T12:00:00Z')

const state: PlannerState = {
  version: 1,
  people: [
    { id: 'A', name: 'Grano', color: '#2563eb' },
    { id: 'B', name: 'Pietro', color: '#d97706' },
  ],
  nights: [
    { date: '2026-11-02', personId: 'A' },
    { date: '2026-11-03', personId: 'A' },
    { date: '2026-11-04', personId: 'B' },
    { date: '2026-11-05', personId: 'B' },
  ],
  presence: [
    { date: '2026-11-02', personId: 'A', status: 'present', source: 'auto' },
    { date: '2026-11-03', personId: 'A', status: 'present', source: 'auto' },
    { date: '2026-11-04', personId: 'A', status: 'present', source: 'auto' },
    { date: '2026-11-04', personId: 'B', status: 'present', source: 'auto' },
    { date: '2026-11-05', personId: 'B', status: 'present', source: 'auto' },
    { date: '2026-11-06', personId: 'B', status: 'present', source: 'auto' },
  ],
  absences: [
    {
      id: 'absence-1',
      personId: 'A',
      start: '2026-11-10',
      end: '2026-11-10',
      type: 'vacation',
      note: 'ponte, test; uno',
    },
  ],
  holidays: [],
  settings: {
    swCapPct: 50,
    strictCap: true,
    weekendDays: [6, 7],
    allowPresenceWithoutNight: true,
    timezone: 'Europe/Rome',
  },
  pattern: { 1: 'A', 2: 'A', 3: 'B', 4: 'B', 5: null, 6: null, 7: null },
}

describe('coerenza feed frontend / Edge Function', () => {
  it('produce lo stesso calendario personale', () => {
    const frontend = generateIcs(state, 'A', { months: [NOVEMBER], now })
    const edge = generateCalendar(state, 'A', { months: [NOVEMBER], now })
    expect(edge).toBe(frontend)
  })

  it('produce lo stesso calendario stanza', () => {
    const frontend = generateIcs(state, 'room', { months: [NOVEMBER], now })
    const edge = generateCalendar(state, 'room', { months: [NOVEMBER], now })
    expect(edge).toBe(frontend)
  })
})
