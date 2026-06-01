import { describe, it, expect } from 'vitest'
import { statusCreateSchema, statusUpdateSchema, reorderSchema, nextSortOrder } from './status'

describe('statusCreateSchema', () => {
  it('accepts a label with a default colour', () => {
    const r = statusCreateSchema.safeParse({ label: 'Viewing' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.color).toBe('#9e5733')
  })
  it('rejects an empty label', () => {
    expect(statusCreateSchema.safeParse({ label: '' }).success).toBe(false)
  })
  it('rejects a non-hex colour', () => {
    expect(statusCreateSchema.safeParse({ label: 'X', color: 'red' }).success).toBe(false)
  })
})

describe('statusUpdateSchema', () => {
  it('allows a partial update (colour only)', () => {
    expect(statusUpdateSchema.safeParse({ color: '#15803d' }).success).toBe(true)
  })
})

describe('reorderSchema', () => {
  it('accepts an array of ids', () => {
    expect(reorderSchema.safeParse({ ids: [3, 1, 2] }).success).toBe(true)
  })
})

describe('nextSortOrder', () => {
  it('is 0 for an empty list', () => {
    expect(nextSortOrder([])).toBe(0)
  })
  it('is max + 1 otherwise', () => {
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 4 }, { sortOrder: 2 }])).toBe(5)
  })
})
