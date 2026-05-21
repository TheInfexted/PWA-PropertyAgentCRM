import { describe, it, expect } from 'vitest'
import { leadInputSchema } from './lead'

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
