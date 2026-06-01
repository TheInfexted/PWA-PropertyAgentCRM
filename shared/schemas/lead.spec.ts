import { describe, it, expect } from 'vitest'
import { leadInputSchema, bulkActionSchema } from './lead'

describe('leadInputSchema', () => {
  it('accepts a lead with only a name', () => {
    const r = leadInputSchema.safeParse({ name: 'Dean Cheong' })
    expect(r.success).toBe(true)
  })
  it('accepts a lead with only a phone', () => {
    const r = leadInputSchema.safeParse({ phone: '60128975215' })
    expect(r.success).toBe(true)
  })
  it('rejects a lead with neither name nor phone', () => {
    const r = leadInputSchema.safeParse({ area: 'Petaling Jaya' })
    expect(r.success).toBe(false)
  })
  it('rejects an invalid email when provided', () => {
    const r = leadInputSchema.safeParse({ name: 'X', email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
})

describe('bulkActionSchema', () => {
  it('accepts a delete with ids', () => {
    expect(bulkActionSchema.safeParse({ action: 'delete', ids: [1, 2, 3] }).success).toBe(true)
  })
  it('requires assignedTo for an assign action', () => {
    expect(bulkActionSchema.safeParse({ action: 'assign', ids: [1] }).success).toBe(false)
    expect(bulkActionSchema.safeParse({ action: 'assign', ids: [1], assignedTo: 5 }).success).toBe(true)
  })
  it('requires statusId for a status action', () => {
    expect(bulkActionSchema.safeParse({ action: 'status', ids: [1] }).success).toBe(false)
    expect(bulkActionSchema.safeParse({ action: 'status', ids: [1], statusId: 2 }).success).toBe(true)
  })
  it('rejects an empty id list', () => {
    expect(bulkActionSchema.safeParse({ action: 'delete', ids: [] }).success).toBe(false)
  })
})
