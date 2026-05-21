import { describe, it, expect } from 'vitest'
import { normalizePhone, dedupeKey } from './phone'

describe('normalizePhone (region MY)', () => {
  it('keeps a country-coded number without plus (sheet format)', () => {
    expect(normalizePhone('60128975215')).toEqual({ raw: '60128975215', e164: '+60128975215', valid: true })
  })
  it('upgrades a local number with leading zero', () => {
    expect(normalizePhone('0128975215').e164).toBe('+60128975215')
  })
  it('accepts a pretty-printed +60 number', () => {
    expect(normalizePhone('+60 12-897 5215').e164).toBe('+60128975215')
  })
  it('flags an obviously-too-short number as invalid', () => {
    expect(normalizePhone('12')).toEqual({ raw: '12', e164: null, valid: false })
  })
  it('treats empty input as invalid', () => {
    expect(normalizePhone('').valid).toBe(false)
  })
})

describe('dedupeKey', () => {
  it('uses the e164 when valid', () => {
    expect(dedupeKey(normalizePhone('60128975215'))).toBe('+60128975215')
  })
  it('falls back to digits when invalid', () => {
    expect(dedupeKey(normalizePhone('12'))).toBe('12')
  })
})
