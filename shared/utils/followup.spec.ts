import { describe, it, expect } from 'vitest'
import { followUpState, todayStr, businessToday, dateInputToStored, storedToDateInput } from './followup'

const TODAY = '2026-06-01'

describe('followUpState', () => {
  it('is "today" on the same calendar day', () => expect(followUpState('2026-06-01', TODAY)).toBe('today'))
  it('is "overdue" before today', () => expect(followUpState('2026-05-30', TODAY)).toBe('overdue'))
  it('is "upcoming" after today', () => expect(followUpState('2026-06-05', TODAY)).toBe('upcoming'))
  it('is null with no date', () => expect(followUpState(null, TODAY)).toBeNull())
})

describe('todayStr', () => {
  it('formats the local date as YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 5, 1, 12, 0, 0))).toBe('2026-06-01')
  })
})

describe('businessToday', () => {
  it('picks the calendar day in the given IANA timezone', () => {
    // 2026-06-01T17:00Z is 2026-06-02 01:00 in UTC+8
    expect(businessToday('Asia/Kuala_Lumpur', new Date('2026-06-01T17:00:00.000Z'))).toBe('2026-06-02')
    expect(businessToday('UTC', new Date('2026-06-01T17:00:00.000Z'))).toBe('2026-06-01')
  })
  it('agrees across the boundary at UTC midday', () => {
    expect(businessToday('Asia/Kuala_Lumpur', new Date('2026-06-02T04:00:00.000Z'))).toBe('2026-06-02')
  })
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
