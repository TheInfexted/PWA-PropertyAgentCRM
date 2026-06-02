import { describe, it, expect } from 'vitest'
import { accountUpdateSchema, passwordChangeSchema } from './account'

describe('accountUpdateSchema', () => {
  const img = 'data:image/png;base64,iVBORw0KGgo='
  it('accepts a name-only update', () => {
    expect(accountUpdateSchema.safeParse({ name: 'Sam' }).success).toBe(true)
  })
  it('accepts an avatar data URL and a null (clear)', () => {
    expect(accountUpdateSchema.safeParse({ avatar: img }).success).toBe(true)
    expect(accountUpdateSchema.safeParse({ avatar: null }).success).toBe(true)
  })
  it('rejects a non-image avatar string', () => {
    expect(accountUpdateSchema.safeParse({ avatar: 'data:text/plain;base64,xx' }).success).toBe(false)
  })
  it('rejects an empty patch and a blank name', () => {
    expect(accountUpdateSchema.safeParse({}).success).toBe(false)
    expect(accountUpdateSchema.safeParse({ name: '  ' }).success).toBe(false)
  })
})

describe('passwordChangeSchema', () => {
  it('requires an 8+ char new password', () => {
    expect(passwordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'hunter22' }).success).toBe(true)
    expect(passwordChangeSchema.safeParse({ currentPassword: 'x', newPassword: 'short' }).success).toBe(false)
  })
})
