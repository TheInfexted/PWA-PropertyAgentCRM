import { describe, it, expect } from 'vitest'
import { followUpState, todayStr, dateInputToStored, storedToDateInput } from './followup'

// Local noon so the local calendar date is deterministic regardless of the runner TZ.
const NOW = new Date(2026, 5, 1, 12, 0, 0)

describe('followUpState', () => {
  it('is "today" on the same calendar day', () => expect(followUpState('2026-06-01', NOW)).toBe('today'))
  it('is "overdue" before today', () => expect(followUpState('2026-05-30', NOW)).toBe('overdue'))
  it('is "upcoming" after today', () => expect(followUpState('2026-06-05', NOW)).toBe('upcoming'))
  it('is null with no date', () => expect(followUpState(null, NOW)).toBeNull())
})

describe('todayStr', () => {
  it('formats the local date as YYYY-MM-DD', () => expect(todayStr(NOW)).toBe('2026-06-01'))
})

describe('dateInputToStored / storedToDateInput', () => {
  it('passes a date input through, empty -> null', () => {
    expect(dateInputToStored('2026-06-01')).toBe('2026-06-01')
    expect(dateInputToStored('')).toBeNull()
  })
  it('reads a stored date back for the input; tolerates legacy ISO; null -> ""', () => {
    expect(storedToDateInput('2026-06-01')).toBe('2026-06-01')
    expect(storedToDateInput('2026-06-01T00:00:00.000Z')).toBe('2026-06-01')
    expect(storedToDateInput(null)).toBe('')
  })
})
