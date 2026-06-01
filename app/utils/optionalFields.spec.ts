import { describe, it, expect } from 'vitest'
import { formatBudget, optionalFieldDisplay } from './optionalFields'

describe('formatBudget', () => {
  it('is empty when both bounds are null', () => {
    expect(formatBudget(null, null)).toBe('')
  })
  it('formats a min–max range with thousands separators', () => {
    expect(formatBudget(300000, 500000)).toBe('300,000–500,000')
  })
  it('formats an open-ended min or max', () => {
    expect(formatBudget(300000, null)).toBe('≥ 300,000')
    expect(formatBudget(null, 500000)).toBe('≤ 500,000')
  })
})

describe('optionalFieldDisplay', () => {
  it('reads simple fields', () => {
    expect(optionalFieldDisplay({ email: 'a@b.my' }, 'email')).toBe('a@b.my')
    expect(optionalFieldDisplay({ propertyType: 'Condo' }, 'propertyType')).toBe('Condo')
    expect(optionalFieldDisplay({ intent: 'buy' }, 'intent')).toBe('buy')
  })
  it('joins tags and formats budget', () => {
    expect(optionalFieldDisplay({ tags: ['hot', 'vip'] }, 'tags')).toBe('hot, vip')
    expect(optionalFieldDisplay({ budgetMin: 100000, budgetMax: 200000 }, 'budget')).toBe('100,000–200,000')
  })
  it('returns empty string for missing values', () => {
    expect(optionalFieldDisplay({}, 'email')).toBe('')
    expect(optionalFieldDisplay({}, 'tags')).toBe('')
  })
})
