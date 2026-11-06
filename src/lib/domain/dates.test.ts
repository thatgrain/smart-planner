import { describe, expect, it } from 'vitest'
import { isoWeekNumber, monthGrid } from './dates'

describe('numero settimana ISO', () => {
  it('usa la numerazione lunedì-domenica', () => {
    expect(isoWeekNumber('2026-01-01')).toBe(1)
    expect(isoWeekNumber('2026-11-02')).toBe(45)
    expect(isoWeekNumber('2026-12-31')).toBe(53)
    expect(isoWeekNumber('2027-01-01')).toBe(53)
  })
})

describe('griglia del mese', () => {
  it('include i giorni adiacenti necessari a completare le settimane', () => {
    const cells = monthGrid('2026-11')

    expect(cells).toHaveLength(42)
    expect(cells[0]?.date).toBe('2026-10-26')
    expect(cells.at(-1)?.date).toBe('2026-12-06')
    expect(cells.find((cell) => cell.date === '2026-10-31')?.inMonth).toBe(false)
    expect(cells.find((cell) => cell.date === '2026-11-01')?.inMonth).toBe(true)
    expect(cells.find((cell) => cell.date === '2026-12-01')?.inMonth).toBe(false)
  })
})
