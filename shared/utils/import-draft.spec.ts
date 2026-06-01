import { describe, it, expect } from 'vitest'
import { toDraft, normalizeDraft, markInBatchDupes } from './import'
import type { AnnotatedRow } from './import'

const MAP = { name: 0, phone: 1, area: 2, status: 3, remarks: 4 }

describe('toDraft', () => {
  it('pulls the mapped cells (missing columns become empty)', () => {
    expect(toDraft(['Dean', '60128975215', 'PJ', 'Callback', 'hot'], MAP))
      .toEqual({ name: 'Dean', phone: '60128975215', area: 'PJ', statusLabel: 'Callback', remarks: 'hot' })
    expect(toDraft(['Dean'], MAP))
      .toEqual({ name: 'Dean', phone: '', area: '', statusLabel: '', remarks: '' })
  })
})

describe('normalizeDraft', () => {
  it('normalizes the phone and marks valid when there is a name or phone', () => {
    const r = normalizeDraft({ name: 'Dean', phone: '60128975215', area: '', statusLabel: '', remarks: '' })
    expect(r.phoneE164).toBe('+60128975215')
    expect(r.phoneValid).toBe(true)
    expect(r.valid).toBe(true)
    expect(r.error).toBeNull()
  })
  it('flags a row with neither name nor phone', () => {
    const r = normalizeDraft({ name: '', phone: '', area: 'PJ', statusLabel: '', remarks: '' })
    expect(r.valid).toBe(false)
    expect(r.error).toBe('No name or phone')
  })
})

describe('markInBatchDupes', () => {
  it('keeps the first occurrence, flags later same-phone rows', () => {
    const rows = [
      { phoneE164: '+60128975215', duplicate: null },
      { phoneE164: '+60111111111', duplicate: null },
      { phoneE164: '+60128975215', duplicate: null },
    ] as Pick<AnnotatedRow, 'phoneE164' | 'duplicate'>[]
    markInBatchDupes(rows)
    expect(rows.map((r) => r.duplicate)).toEqual([null, null, 'in-batch'])
  })
})
