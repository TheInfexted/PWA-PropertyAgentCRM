import { describe, it, expect } from 'vitest'
import { followUpState, dateInputToIso, isoToDateInput } from './followup'

const NOW = new Date('2026-06-01T10:00:00.000Z')

describe('followUpState', () => {
  it('is "today" when the date is the same calendar day', () => {
    expect(followUpState('2026-06-01T00:00:00.000Z', NOW)).toBe('today')
  })
  it('is "overdue" when the date is before today', () => {
    expect(followUpState('2026-05-30T00:00:00.000Z', NOW)).toBe('overdue')
  })
  it('is "upcoming" when the date is after today', () => {
    expect(followUpState('2026-06-05T00:00:00.000Z', NOW)).toBe('upcoming')
  })
  it('is null when there is no date', () => {
    expect(followUpState(null, NOW)).toBeNull()
  })
})

describe('dateInputToIso / isoToDateInput', () => {
  it('converts a date input to an ISO datetime at UTC midnight', () => {
    expect(dateInputToIso('2026-06-01')).toBe('2026-06-01T00:00:00.000Z')
  })
  it('returns null for an empty date input', () => {
    expect(dateInputToIso('')).toBeNull()
  })
  it('converts an ISO datetime back to a date input value', () => {
    expect(isoToDateInput('2026-06-01T00:00:00.000Z')).toBe('2026-06-01')
  })
  it('returns empty string for a null ISO', () => {
    expect(isoToDateInput(null)).toBe('')
  })
})
