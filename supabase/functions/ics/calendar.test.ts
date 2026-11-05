import { describe, expect, it } from 'vitest'
import {
  generateCalendar,
  getFeedMonths,
  type FeedState,
} from './calendar'

const NOVEMBER = '2026-11'

function state(): FeedState {
  return {
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
      { date: '2026-11-02', personId: 'A', status: 'present' },
      { date: '2026-11-03', personId: 'A', status: 'present' },
      { date: '2026-11-04', personId: 'A', status: 'present' },
      { date: '2026-11-04', personId: 'B', status: 'present' },
      { date: '2026-11-05', personId: 'B', status: 'present' },
      { date: '2026-11-06', personId: 'B', status: 'present' },
    ],
    absences: [],
    holidays: [],
    months: [{ month: NOVEMBER, status: 'draft' }],
    settings: { weekendDays: [6, 7] },
  }
}

const now = new Date('2026-11-05T12:00:00Z')

describe('feed ICS Edge Function', () => {
  it('genera il calendario personale con ufficio e smart working', () => {
    const ics = generateCalendar(state(), 'A', { months: [NOVEMBER], now })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('X-WR-CALNAME:SmartPlanner – Grano')
    expect(ics).toContain('SUMMARY:Ufficio – Grano')
    expect(ics).toContain('SUMMARY:Smart working – Grano')
    expect(ics).toContain('UID:sp-A-office-2026-11-02@smartplanner')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102')
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20261101')
    expect(ics.split('BEGIN:VEVENT')).toHaveLength(22)
    expect(ics.endsWith('\r\n')).toBe(true)
  })

  it('genera il feed stanza con i pernottamenti', () => {
    const ics = generateCalendar(state(), 'room', { months: [NOVEMBER], now })

    expect(ics).toContain('SUMMARY:Notte in stanza – Grano')
    expect(ics).toContain('SUMMARY:Notte in stanza – Pietro')
    expect(ics).toContain('UID:sp-room-2026-11-02@smartplanner')
    expect(ics.split('BEGIN:VEVENT')).toHaveLength(5)
  })

  it('include i mesi con dati nel feed in abbonamento', () => {
    const months = getFeedMonths(state(), now)
    expect(months).toContain('2026-10')
    expect(months).toContain('2026-11')
    expect(months).toContain('2026-12')
    expect(months).toContain('2027-01')
  })

  it('esegue l’escape di virgole e punti e virgola', () => {
    const current = state()
    current.absences = [
      {
        id: 'absence-1',
        personId: 'A',
        start: '2026-11-10',
        end: '2026-11-10',
        type: 'vacation',
        note: 'ponte, test; uno',
      },
    ]

    const ics = generateCalendar(current, 'A', { months: [NOVEMBER], now })
    expect(ics).toContain('ponte\\, test\\; uno')
  })

  it('non esporta smart working in un mese senza piano', () => {
    const current = state()
    current.months = []
    current.nights = []
    current.presence = []

    const ics = generateCalendar(current, 'A', { months: [NOVEMBER], now })
    expect(ics).not.toContain('BEGIN:VEVENT')
  })
})
