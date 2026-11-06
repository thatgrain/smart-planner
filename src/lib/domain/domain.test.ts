import { describe, expect, it } from 'vitest'
import { daysInMonth } from './dates'
import { isEligible } from './eligibility'
import { isPersonPresent, isPresenceCoveredByNight } from './coverage'
import { getItalianHolidays } from './holidays'
import { generateIcs } from './ics'
import {
  getMonthMetrics,
  getPersonMetrics,
  getPersonWarnings,
} from './metrics'
import {
  addAbsence,
  addHoliday,
  applyPatternToMonth,
  createInitialState,
  resetPresenceForDay,
  setNight,
  syncAutoPresence,
  togglePresence,
} from './state'
import type { PlannerState } from './types'

const NOVEMBER = '2026-11'

/**
 * Deterministic state: same people/settings as the app, but no seeded nights
 * or presence. November 2026 has 21 weekdays and no national holidays.
 */
function baseState(): PlannerState {
  const initial = createInitialState(new Date(2026, 10, 1))
  return {
    ...initial,
    nights: [],
    presence: [],
    absences: [],
    holidays: [...getItalianHolidays(2026), ...getItalianHolidays(2027)],
  }
}

function presenceFor(personId: 'A' | 'B', dates: string[]) {
  return dates.map((date) => ({
    date,
    personId,
    status: 'present' as const,
    source: 'manual' as const,
  }))
}

describe('festivi italiani', () => {
  it('include i festivi fissi e il lunedì dell’Angelo', () => {
    const holidays = getItalianHolidays(2026)
    expect(holidays.some((holiday) => holiday.date === '2026-01-01')).toBe(true)
    expect(holidays.some((holiday) => holiday.date === '2026-04-25')).toBe(true)
    expect(holidays.some((holiday) => holiday.date === '2026-12-25')).toBe(true)
    expect(
      holidays.some(
        (holiday) => holiday.date === '2026-04-06' && holiday.name.includes('Lunedì'),
      ),
    ).toBe(true)
  })
})

describe('modello soggiorno', () => {
  it('una notte copre il giorno stesso e quello successivo', () => {
    let state = baseState()
    state = setNight(state, '2026-11-02', 'A')
    state = setNight(state, '2026-11-03', 'A')

    expect(isPresenceCoveredByNight(state, 'A', '2026-11-02')).toBe(true)
    expect(isPresenceCoveredByNight(state, 'A', '2026-11-03')).toBe(true)
    expect(isPresenceCoveredByNight(state, 'A', '2026-11-04')).toBe(true)
    expect(isPresenceCoveredByNight(state, 'A', '2026-11-05')).toBe(false)
    expect(isPresenceCoveredByNight(state, 'B', '2026-11-02')).toBe(false)

    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(true)
    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(true)
    expect(isPersonPresent(state, 'A', '2026-11-04')).toBe(true)
    expect(isPersonPresent(state, 'A', '2026-11-05')).toBe(false)
  })

  it('la notte di domenica copre la presenza del lunedì', () => {
    const state = setNight(baseState(), '2026-11-01', 'A')
    expect(isPresenceCoveredByNight(state, 'A', '2026-11-02')).toBe(true)
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(true)
  })

  it('permette una sola persona per notte', () => {
    let state = setNight(baseState(), '2026-11-02', 'A')
    state = setNight(state, '2026-11-02', 'B')

    const nights = state.nights.filter((night) => night.date === '2026-11-02')
    expect(nights).toHaveLength(1)
    expect(nights[0]?.personId).toBe('B')
  })

  it('rimuove le presenze automatiche quando la notte viene liberata', () => {
    let state = setNight(baseState(), '2026-11-02', 'A')
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(true)
    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(true)

    state = setNight(state, '2026-11-02', null)
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(false)
    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(false)
  })

  it('mantiene le esclusioni manuali anche dopo un nuovo sync', () => {
    let state = setNight(baseState(), '2026-11-02', 'A')
    state = togglePresence(state, '2026-11-02', 'A')
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(false)

    state = syncAutoPresence(state)
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(false)

    state = resetPresenceForDay(state, '2026-11-02', 'A')
    expect(isPersonPresent(state, 'A', '2026-11-02')).toBe(true)
  })
})

describe('settimana tipo e passaggio', () => {
  it('genera la settimana A lun–mer e B mer–ven con il mercoledì di passaggio', () => {
    const state = applyPatternToMonth(baseState(), NOVEMBER)
    const metrics = getMonthMetrics(state, NOVEMBER)

    expect(metrics.people.A.eligibleCount).toBe(21)
    expect(metrics.people.B.eligibleCount).toBe(21)
    expect(metrics.people.A.presenceCount).toBe(13)
    expect(metrics.people.B.presenceCount).toBe(12)
    expect(metrics.people.A.smartCount).toBe(8)
    expect(metrics.people.B.smartCount).toBe(9)
    expect(metrics.people.A.capOk).toBe(true)
    expect(metrics.people.B.capOk).toBe(true)
    expect(metrics.handoverDays).toEqual([
      '2026-11-04',
      '2026-11-11',
      '2026-11-18',
      '2026-11-25',
    ])
    expect(metrics.people.A.nightCount).toBe(9)
    expect(metrics.people.B.nightCount).toBe(8)
    expect(metrics.freeWorkdayNights).toEqual([
      '2026-11-06',
      '2026-11-13',
      '2026-11-20',
      '2026-11-27',
    ])
  })
})

describe('calcolo del 50%', () => {
  it('con 21 giorni eleggibili il massimo stretto è 10 giorni di SW', () => {
    const eligible = daysInMonth(NOVEMBER).filter((date) => isEligible(baseState(), 'A', date))
    expect(eligible).toHaveLength(21)

    const elevenPresence = {
      ...baseState(),
      presence: presenceFor('A', eligible.slice(0, 11)),
    }
    const okMetrics = getPersonMetrics(elevenPresence, 'A', NOVEMBER)
    expect(okMetrics.smartCount).toBe(10)
    expect(okMetrics.maxSmartDays).toBe(10)
    expect(okMetrics.capOk).toBe(true)

    const tenPresence = {
      ...baseState(),
      presence: presenceFor('A', eligible.slice(0, 10)),
    }
    const overMetrics = getPersonMetrics(tenPresence, 'A', NOVEMBER)
    expect(overMetrics.smartCount).toBe(11)
    expect(overMetrics.maxSmartDays).toBe(10)
    expect(overMetrics.capOk).toBe(false)
    expect(overMetrics.presenceNeeded).toBe(11)
  })
})

describe('assenze, festivi e weekend', () => {
  it('esclude le assenze individuali solo dalla persona interessata', () => {
    let state = baseState()
    state = addAbsence(state, {
      id: 'vacation-1',
      personId: 'A',
      type: 'vacation',
      start: '2026-11-02',
      end: '2026-11-03',
    })

    expect(isEligible(state, 'A', '2026-11-02')).toBe(false)
    expect(isEligible(state, 'B', '2026-11-02')).toBe(true)
    expect(getPersonMetrics(state, 'A', NOVEMBER).eligibleCount).toBe(19)
    expect(getPersonMetrics(state, 'B', NOVEMBER).eligibleCount).toBe(21)
  })

  it('esclude le chiusure collettive e i festivi per entrambi', () => {
    let state = baseState()
    state = addAbsence(state, {
      id: 'closure-1',
      personId: null,
      type: 'closure',
      start: '2026-11-04',
      end: '2026-11-04',
    })
    state = addHoliday(state, { date: '2026-11-05', name: 'Festivo test', source: 'custom' })

    expect(isEligible(state, 'A', '2026-11-04')).toBe(false)
    expect(isEligible(state, 'B', '2026-11-04')).toBe(false)
    expect(isEligible(state, 'A', '2026-11-05')).toBe(false)
    expect(getPersonMetrics(state, 'A', NOVEMBER).eligibleCount).toBe(19)
    expect(getPersonMetrics(state, 'B', NOVEMBER).eligibleCount).toBe(19)
  })

  it('considera il weekend non eleggibile', () => {
    expect(isEligible(baseState(), 'A', '2026-11-01')).toBe(false)
    expect(isEligible(baseState(), 'A', '2026-11-07')).toBe(false)
  })

  it('rimuove le presenze automatiche quando un giorno diventa festivo', () => {
    let state = setNight(baseState(), '2026-11-02', 'A')
    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(true)

    state = addHoliday(state, { date: '2026-11-03', name: 'Festivo test', source: 'custom' })
    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(false)
  })
})

describe('eccezioni e avvisi', () => {
  it('consente una presenza senza notte e la segnala come eccezione', () => {
    const state = togglePresence(baseState(), '2026-11-03', 'A')
    const metrics = getPersonMetrics(state, 'A', NOVEMBER)
    const warnings = getPersonWarnings(state, 'A', NOVEMBER)

    expect(isPersonPresent(state, 'A', '2026-11-03')).toBe(true)
    expect(metrics.exceptionPresenceDays).toContain('2026-11-03')
    expect(warnings.some((warning) => warning.id === 'exception-A-2026-11-03')).toBe(true)
  })

  it('segnala una notte assegnata durante un’assenza', () => {
    let state = setNight(baseState(), '2026-11-02', 'A')
    state = addAbsence(state, {
      id: 'sick-1',
      personId: 'A',
      type: 'sick',
      start: '2026-11-02',
      end: '2026-11-02',
    })
    const warnings = getPersonWarnings(state, 'A', NOVEMBER)
    expect(warnings.some((warning) => warning.id === 'night-absence-A-2026-11-02')).toBe(true)
  })

  it('non considera sprecata una notte di fine mese usata il mese successivo', () => {
    let state = setNight(baseState(), '2026-11-30', 'A')
    state = togglePresence(state, '2026-12-01', 'A')
    const metrics = getPersonMetrics(state, 'A', NOVEMBER)

    expect(metrics.usefulNights).toHaveLength(1)
    expect(metrics.wastedNights).toHaveLength(0)
  })
})

describe('esportazione ICS', () => {
  const now = new Date('2026-11-05T12:00:00Z')

  it('genera un calendario personale con ufficio e smart working', () => {
    const state = applyPatternToMonth(baseState(), NOVEMBER)
    const ics = generateIcs(state, 'A', { months: [NOVEMBER], now })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('SUMMARY:Ufficio – Grano')
    expect(ics).toContain('SUMMARY:Smart working – Grano')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102')
    expect(ics).toContain('DTEND;VALUE=DATE:20261103')
    expect(ics).toContain('UID:sp-A-office-2026-11-02@smartplanner')
    expect(ics).toContain('TRANSP:TRANSPARENT')
    expect(ics).not.toContain('DTSTART;VALUE=DATE:20261101')
    expect(ics.split('BEGIN:VEVENT')).toHaveLength(22)
    expect(ics.endsWith('\r\n')).toBe(true)
  })

  it('genera il feed stanza con le notti', () => {
    const state = applyPatternToMonth(baseState(), NOVEMBER)
    const ics = generateIcs(state, 'room', { months: [NOVEMBER], now })

    expect(ics).toContain('SUMMARY:Notte in stanza – Grano')
    expect(ics).toContain('SUMMARY:Notte in stanza – Pietro')
    expect(ics).toContain('UID:sp-room-2026-11-02@smartplanner')
    expect(ics.split('BEGIN:VEVENT')).toHaveLength(18)
  })

  it('non esporta smart working per mesi senza piano', () => {
    const ics = generateIcs(baseState(), 'A', { months: [NOVEMBER], now })
    expect(ics).not.toContain('BEGIN:VEVENT')
  })

  it('esegue l’escape di virgole e punti e virgola', () => {
    let state = baseState()
    state = addAbsence(state, {
      id: 'escape-1',
      personId: 'A',
      type: 'vacation',
      start: '2026-11-02',
      end: '2026-11-02',
      note: 'ponte, test; uno',
    })
    const ics = generateIcs(state, 'A', { months: [NOVEMBER], now })
    expect(ics).toContain('ponte\\, test\\; uno')
  })
})
